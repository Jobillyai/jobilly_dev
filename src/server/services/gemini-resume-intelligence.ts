import "server-only";
import {z} from "zod";
import {JOB_CATEGORY_IDS,JOB_TAXONOMY_VERSION} from "@/lib/job-category-taxonomy";
export const RESUME_INTELLIGENCE_PROMPT_VERSION="2026-07-v1";
export const RESUME_INTELLIGENCE_SCHEMA_VERSION="2026-07-v1";
const schema=z.object({
 targetRoles:z.array(z.string().min(2).max(100)).min(1).max(8),
 responsibilities:z.array(z.string().min(2).max(240)).max(30),
 skills:z.array(z.string().min(1).max(100)).max(50),
 searchKeywords:z.array(z.string().min(1).max(80)).min(1).max(20),
 canonicalSearchTitle:z.string().min(2).max(100),categoryId:z.enum(JOB_CATEGORY_IDS),
 confidence:z.number().min(0).max(1),acceptedTitlePatterns:z.array(z.string().min(2).max(80)).max(12),
 excludedCategoryIds:z.array(z.enum(JOB_CATEGORY_IDS)).max(12),
});
export type ResumeIntentResult=z.infer<typeof schema>&{model:string};
function key(){return process.env.GEMINI_API_KEY?.trim()||process.env.GOOGLE_API_KEY?.trim()||null}
function parse(text:string){return JSON.parse(text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim())}
export async function classifyResumeIntent(input:{resumeText:string;interestedRole?:string|null}):Promise<ResumeIntentResult>{
 const apiKey=key();if(!apiKey)throw new Error("GEMINI_API_KEY is not configured.");
 const prompt=`Classify this resume for a strict occupational job search. JSON only.
categoryId must be one of: ${JOB_CATEGORY_IDS.join(", ")}.
Taxonomy ${JOB_TAXONOMY_VERSION}. Data Center Technician is IT infrastructure.
Data Technician is data operations. Never merge either with electrical/electronics,
mechanical/maintenance, field service, or medical/lab technicians. If ambiguous use
other and confidence below .70. acceptedTitlePatterns are literal title phrases.
Shape: {"targetRoles":[],"responsibilities":[],"skills":[],"searchKeywords":[],
"canonicalSearchTitle":"","categoryId":"","confidence":0,"acceptedTitlePatterns":[],
"excludedCategoryIds":[]}
Interested role: ${input.interestedRole?.trim()||"not supplied"}
Resume: ${input.resumeText.slice(0,50000)}`;
 let message="Resume analysis is temporarily unavailable.";
 for(const model of ["gemini-2.5-flash","gemini-3-flash-preview","gemini-flash-lite-latest"]){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45000);
  try{
   const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,{
    method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,
    body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:.05,maxOutputTokens:4096,responseMimeType:"application/json",...(model.startsWith("gemini-2.5")?{thinkingConfig:{thinkingBudget:0}}:{})}})
   });
   if(!response.ok){message=response.status===429?"Resume analysis is rate-limited. Retry shortly.":`Resume analysis failed (${response.status}).`;continue}
   const body=await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
   const text=body.candidates?.[0]?.content?.parts?.map(p=>p.text??"").join("");if(!text)continue;
   const result=schema.safeParse(parse(text));if(!result.success){message="Resume analysis returned an invalid structure.";continue}
   return {...result.data,model};
  }catch(error){message=error instanceof Error&&error.name==="AbortError"?"Resume analysis timed out.":"Could not reach resume analysis."}finally{clearTimeout(timer)}
 }
 throw new Error(message);
}
