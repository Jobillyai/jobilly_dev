import {describe,expect,it} from "vitest";
import {
  detectJobCategory,
  strictJobMatchesIntent,
  type StrictJobIntent,
} from "@/lib/job-category-taxonomy";
import {
  validateBaseResumeFile,
  validateTxtOverride,
} from "@/lib/resume-source-validation";

const dataIntent:StrictJobIntent={
  canonicalSearchTitle:"Data Technician",categoryId:"data_operations_technician",
  searchKeywords:["data quality","database"],acceptedTitlePatterns:["data technician"],
  excludedCategoryIds:["electrical_electronics_technician","mechanical_maintenance_technician"],
  intentFingerprint:"test",
};

describe("strict occupational classification",()=>{
  it("accepts an IT data technician and rejects electronics despite generic data words",()=>{
    expect(strictJobMatchesIntent({
      role:"Data Technician",
      jdText:"Maintain database records, data quality, and SQL reports.",
    },dataIntent).accepted).toBe(true);
    expect(strictJobMatchesIntent({
      role:"Electronics Technician",
      jdText:"Record test data and maintain electrical circuit boards.",
    },dataIntent)).toMatchObject({
      accepted:false,detectedCategory:"electrical_electronics_technician",
    });
  });

  it("keeps data center technicians in IT infrastructure",()=>{
    expect(detectJobCategory(
      "Data Center Technician",
      "Rack servers, troubleshoot networks, cabling, Linux, and incident tickets.",
    ).categoryId).toBe("data_center_technician");
  });

  it("fails closed for an unqualified generic technician title",()=>{
    expect(detectJobCategory("Technician II","Handle daily tasks and collect data.").categoryId)
      .toBe("other");
  });
});

describe("resume source validation",()=>{
  it("checks PDF signatures instead of trusting MIME and extension",()=>{
    expect(()=>validateBaseResumeFile(Buffer.from("not a pdf"),"resume.pdf","application/pdf"))
      .toThrow(/genuine PDF or DOCX/);
    expect(validateBaseResumeFile(Buffer.from("%PDF-1.7"),"resume.pdf","application/pdf"))
      .toBe("pdf");
  });

  it("rejects binary TXT and accepts a bounded UTF-8 override",()=>{
    expect(()=>validateTxtOverride(Buffer.from([65,0,66]),"resume.txt","text/plain"))
      .toThrow(/Binary/);
    const text="Data technician experienced with SQL, data quality, records, and databases.";
    expect(validateTxtOverride(Buffer.from(text),"resume.txt","text/plain")).toBe(text);
  });
});
