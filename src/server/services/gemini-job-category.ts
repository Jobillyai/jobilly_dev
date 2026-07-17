import {z} from "zod";
import {
  JOB_CATEGORY_IDS,
  detectJobCategory,
  type JobCategoryId,
  type StrictJobIntent,
} from "@/lib/job-category-taxonomy";
import type {JobListing} from "@/server/services/job-market-search";

const responseSchema=z.object({results:z.array(z.object({
 index:z.number().int().min(0),categoryId:z.enum(JOB_CATEGORY_IDS),confidence:z.number().min(0).max(1),
}))});
export type ClassifiedMarketJob={job:JobListing;detectedCategory:JobCategoryId;confidence:number};

export async function classifyJobsForStrictIntent(
 jobs:JobListing[],intent:StrictJobIntent,
):Promise<{accepted:ClassifiedMarketJob[];rejectedCount:number;error?:string}>{
 const accepted:ClassifiedMarketJob[]=[];const ambiguous:Array<{job:JobListing;index:number}>=[];
 let rejectedCount=0;
 jobs.forEach((job,index)=>{
  const found=detectJobCategory(job.role,job.jdText);
  if(found.categoryId===intent.categoryId&&found.confidence>=.75){
   const titleOkay=!intent.acceptedTitlePatterns.length||intent.acceptedTitlePatterns.some(p=>job.role.toLowerCase().includes(p.toLowerCase()));
   if(titleOkay)accepted.push({job,detectedCategory:found.categoryId,confidence:found.confidence});else rejectedCount++;
  }else if(found.categoryId==="other")ambiguous.push({job,index});else rejectedCount++;
 });
 if(!ambiguous.length)return {accepted,rejectedCount};
 const apiKey=process.env.GEMINI_API_KEY?.trim()||process.env.GOOGLE_API_KEY?.trim();
 if(!apiKey)return {accepted,rejectedCount:rejectedCount+ambiguous.length,error:"Ambiguous jobs were rejected because category classification is unavailable."};
 const compact=ambiguous.map(({job,index})=>({index,title:job.role,description:job.jdText.slice(0,2500)}));
 const prompt=`Classify each job into exactly one occupational category: ${JOB_CATEGORY_IDS.join(", ")}.
Data Center Technician is IT infrastructure; Data Technician is data operations.
Keep electrical/electronics, mechanical/maintenance/field service, and medical/lab technicians separate.
Return JSON {"results":[{"index":0,"categoryId":"","confidence":0}]}.
Jobs: ${JSON.stringify(compact)}`;
 try{
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0,maxOutputTokens:4096,responseMimeType:"application/json",thinkingConfig:{thinkingBudget:0}}}),
  });
  if(!response.ok)throw new Error(`classifier ${response.status}`);
  const body=await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
  const text=body.candidates?.[0]?.content?.parts?.map(p=>p.text??"").join("");
  const parsed=responseSchema.parse(JSON.parse(text??"{}"));
  const byIndex=new Map(parsed.results.map(result=>[result.index,result]));
  for(const item of ambiguous){
   const result=byIndex.get(item.index);
   if(result?.categoryId===intent.categoryId&&result.confidence>=.8&&!intent.excludedCategoryIds.includes(result.categoryId)){
    accepted.push({job:item.job,detectedCategory:result.categoryId,confidence:result.confidence});
   }else rejectedCount++;
  }
  return {accepted,rejectedCount};
 }catch{
  return {accepted,rejectedCount:rejectedCount+ambiguous.length,error:"Ambiguous jobs were rejected because strict category classification failed."};
 }
}
