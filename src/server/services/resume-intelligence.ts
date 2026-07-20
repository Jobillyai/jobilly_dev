import "server-only";
import {createHash,randomUUID} from "crypto";
import {JOB_CLASSIFIER_VERSION,JOB_TAXONOMY_VERSION,type JobCategoryId,type StrictJobIntent} from "@/lib/job-category-taxonomy";
import {mergeResumeSkillsIntoSearchKeywords} from "@/lib/job-keyword-match";
import {createAdminClient} from "@/server/db/supabase-admin";
import {extractResumeTextFromBuffer} from "@/server/services/resume-text-extract";
import {classifyResumeIntent,RESUME_INTELLIGENCE_PROMPT_VERSION,RESUME_INTELLIGENCE_SCHEMA_VERSION} from "@/server/services/gemini-resume-intelligence";
import {validateBaseResumeFile,validateTxtOverride} from "@/lib/resume-source-validation";
export {validateBaseResumeFile,validateTxtOverride} from "@/lib/resume-source-validation";
export const RESUME_PARSER_VERSION="2026-07-v1";
type SourceKind="base_resume"|"admin_txt_override";
const hash=(value:Buffer|string)=>createHash("sha256").update(value).digest("hex");
async function audit(actorId:string|null,action:string,candidateId:string){
 await createAdminClient().from("audit_log").insert({actor_user_id:actorId,action,target:`candidate:${candidateId}:resume-intelligence`});
}

async function upsertSource(input:{candidateId:string;actorId:string;sourceKind:SourceKind;storagePath:string;fileName:string;contentType:string;buffer:Buffer;extractedText:string}){
 const admin=createAdminClient(),now=new Date().toISOString();
 const {error}=await admin.from("candidate_resume_sources").upsert({
  candidate_id:input.candidateId,source_kind:input.sourceKind,storage_path:input.storagePath,
  original_file_name:input.fileName,canonical_mime:input.contentType,byte_size:input.buffer.length,
  sha256:hash(input.buffer),extracted_text:input.extractedText,parser_version:RESUME_PARSER_VERSION,
  extraction_status:"completed",error_message:null,uploaded_by:input.actorId,extracted_at:now,updated_at:now,
 },{onConflict:"candidate_id,source_kind"});if(error)throw new Error(error.message);
}
export async function registerBaseResumeForIntelligence(input:{candidateId:string;actorId:string;storagePath:string;fileName:string;contentType:string;buffer:Buffer}){
 validateBaseResumeFile(input.buffer,input.fileName,input.contentType);
 const text=await extractResumeTextFromBuffer(input.buffer,input.fileName,input.contentType);
 await upsertSource({...input,sourceKind:"base_resume",extractedText:text});await audit(input.actorId,"resume_source_base_updated",input.candidateId);return invalidateAndAnalyzeResume(input.candidateId);
}
export async function saveAdminTxtOverride(input:{candidateId:string;actorId:string;fileName:string;contentType:string;buffer:Buffer}){
 const text=validateTxtOverride(input.buffer,input.fileName,input.contentType);
 const path=`${input.candidateId}/resume-intelligence/admin-override-${hash(input.buffer).slice(0,16)}.txt`;
 const admin=createAdminClient();const {error}=await admin.storage.from("resumes").upload(path,input.buffer,{upsert:true,contentType:"text/plain; charset=utf-8"});if(error)throw new Error(error.message);
 await upsertSource({...input,sourceKind:"admin_txt_override",storagePath:path,contentType:"text/plain",extractedText:text});await audit(input.actorId,"resume_source_txt_override_updated",input.candidateId);return invalidateAndAnalyzeResume(input.candidateId);
}
export async function removeAdminTxtOverride(candidateId:string,actorId?:string){
 const admin=createAdminClient();const {data}=await admin.from("candidate_resume_sources").select("storage_path").eq("candidate_id",candidateId).eq("source_kind","admin_txt_override").maybeSingle();
 if(data?.storage_path.startsWith(`${candidateId}/`))await admin.storage.from("resumes").remove([data.storage_path]);
 const {error}=await admin.from("candidate_resume_sources").delete().eq("candidate_id",candidateId).eq("source_kind","admin_txt_override");if(error)throw new Error(error.message);await audit(actorId??null,"resume_source_txt_override_removed",candidateId);
 return invalidateAndAnalyzeResume(candidateId);
}
export async function invalidateAndAnalyzeResume(candidateId:string){
 const admin=createAdminClient();const {data:sources,error}=await admin.from("candidate_resume_sources").select("*").eq("candidate_id",candidateId).eq("extraction_status","completed");if(error)throw new Error(error.message);
 const source=sources?.find(r=>r.source_kind==="admin_txt_override")??sources?.find(r=>r.source_kind==="base_resume");
 if(!source?.extracted_text)throw new Error("No analyzed PDF, DOCX, or TXT resume source exists.");
 const fingerprint=hash([source.sha256,source.parser_version,RESUME_INTELLIGENCE_PROMPT_VERSION,RESUME_INTELLIGENCE_SCHEMA_VERSION,JOB_TAXONOMY_VERSION].join(":"));
 const {data:cached}=await admin.from("candidate_resume_analysis").select("*").eq("candidate_id",candidateId).eq("source_fingerprint",fingerprint).eq("status","completed").maybeSingle();
 if(cached){
  if(!cached.category_confirmed_at&&cached.category_id&&cached.canonical_search_title){
   const confirmedAt=new Date().toISOString();
   const {data:confirmed}=await admin.from("candidate_resume_analysis").update({category_confirmed_at:confirmedAt,category_confirmed_by:source.uploaded_by,updated_at:confirmedAt}).eq("candidate_id",candidateId).select("*").single();
   return confirmed??cached;
  }
  return cached;
 }
 const token=randomUUID();const now=new Date().toISOString();
 const {error:pending}=await admin.from("candidate_resume_analysis").upsert({candidate_id:candidateId,effective_source_kind:source.source_kind,source_fingerprint:fingerprint,status:"processing",prompt_version:RESUME_INTELLIGENCE_PROMPT_VERSION,taxonomy_version:JOB_TAXONOMY_VERSION,generation_token:token,category_confirmed_at:null,category_confirmed_by:null,error_message:null,updated_at:now},{onConflict:"candidate_id"});if(pending)throw new Error(pending.message);
 try{
  const {data:profile}=await admin.from("candidate_profiles").select("job_search_role").eq("user_id",candidateId).maybeSingle();
  const result=await classifyResumeIntent({resumeText:source.extracted_text,interestedRole:profile?.job_search_role});
  const analyzedAt=new Date().toISOString();
  const {data,error:updateError}=await admin.from("candidate_resume_analysis").update({status:"completed",target_roles:result.targetRoles,responsibilities:result.responsibilities,skills:result.skills,search_keywords:result.searchKeywords,canonical_search_title:result.canonicalSearchTitle,category_id:result.categoryId,confidence:result.confidence,accepted_title_patterns:result.acceptedTitlePatterns,excluded_category_ids:result.excludedCategoryIds,result_json:result,model:result.model,category_confirmed_at:analyzedAt,category_confirmed_by:source.uploaded_by,analyzed_at:analyzedAt,error_message:null,updated_at:analyzedAt}).eq("candidate_id",candidateId).eq("generation_token",token).select("*").maybeSingle();if(updateError)throw new Error(updateError.message);await audit(source.uploaded_by,"resume_intelligence_analyzed",candidateId);return data;
 }catch(e){await admin.from("candidate_resume_analysis").update({status:"failed",error_message:e instanceof Error?e.message:"Resume analysis failed.",updated_at:new Date().toISOString()}).eq("candidate_id",candidateId).eq("generation_token",token);throw e}
}
export async function getResumeIntelligence(candidateId:string){
 const admin=createAdminClient();const [{data:sources},{data:analysis}]=await Promise.all([admin.from("candidate_resume_sources").select("*").eq("candidate_id",candidateId),admin.from("candidate_resume_analysis").select("*").eq("candidate_id",candidateId).maybeSingle()]);
 return {sources:sources??[],analysis};
}
export async function getConfirmedStrictIntent(candidateId:string):Promise<StrictJobIntent>{
 const {data,error}=await createAdminClient().from("candidate_resume_analysis").select("*").eq("candidate_id",candidateId).eq("status","completed").maybeSingle();if(error)throw new Error(error.message);
 if(!data?.category_id||!data.canonical_search_title)throw new Error("Resume analysis must identify a job category and search title before scraping.");
 const searchKeywords=mergeResumeSkillsIntoSearchKeywords(data.skills,data.search_keywords);
 return {canonicalSearchTitle:data.canonical_search_title,targetRoles:data.target_roles,categoryId:data.category_id as JobCategoryId,skills:data.skills,searchKeywords,acceptedTitlePatterns:data.accepted_title_patterns,excludedCategoryIds:data.excluded_category_ids as JobCategoryId[],intentFingerprint:hash([data.source_fingerprint,data.category_id,data.canonical_search_title,data.target_roles.join("|"),data.skills.join("|"),searchKeywords.join("|"),JOB_CLASSIFIER_VERSION].join(":"))};
}
