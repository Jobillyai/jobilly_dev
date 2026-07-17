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
import {
  countMatchedJobKeywords,
  mergeJobSearchKeywords,
  parseJobSearchKeywords,
} from "@/lib/job-keyword-match";
import {
  buildFortune500SearchPosition,
  hasFortuneCompanySignal,
  parseFortune500Companies,
  selectFortuneCompanyBatch,
} from "@/lib/fortune500-job-search";

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

describe("role keyword matching",()=>{
  it("uses editable comma-separated keywords without requiring every keyword",()=>{
    const keywords=mergeJobSearchKeywords(
      parseJobSearchKeywords("Python, FastAPI, Kubernetes"),
      ["python","postgresql"],
    );
    expect(keywords).toEqual(["python","fastapi","kubernetes","postgresql"]);
    expect(countMatchedJobKeywords(keywords,{
      role:"Python Backend Engineer",
      jdText:"Build FastAPI services deployed with Docker.",
    })).toBe(2);
  });

  it("ranks a JD with more matching keywords above a weaker JD",()=>{
    const keywords=["python","fastapi","kubernetes","postgresql"];
    const strong=countMatchedJobKeywords(keywords,{
      role:"Backend Engineer",
      jdText:"Python and FastAPI services using Kubernetes and PostgreSQL.",
    });
    const weak=countMatchedJobKeywords(keywords,{
      role:"Backend Engineer",
      jdText:"Develop Python services with FastAPI.",
    });
    expect(strong).toBeGreaterThan(weak);
    expect(weak).toBe(2);
  });
});

describe("Fortune 500 targeting",()=>{
  it("adds Fortune employer signals without replacing the role query",()=>{
    expect(buildFortune500SearchPosition("Data Center Technician Python")).toBe(
      'Data Center Technician Python ("Fortune 500" OR "Fortune 100")',
    );
  });

  it("keeps targeted results only when the company or JD carries a Fortune signal",()=>{
    expect(hasFortuneCompanySignal({
      company:"Example Corp",
      jdText:"Join a Fortune 500 infrastructure team.",
    })).toBe(true);
    expect(hasFortuneCompanySignal({
      company:"Small Startup",
      jdText:"Join our infrastructure team.",
    })).toBe(false);
  });

  it("parses a company catalog and rotates bounded target batches",()=>{
    const companies=parseFortune500Companies(
      'Rank,Company,Industry\n1,Walmart,Retail\n2,"Amazon.com",Technology\n3,Apple,Technology\n',
    );
    expect(companies).toEqual(["Walmart","Amazon.com","Apple"]);
    expect(selectFortuneCompanyBatch(companies,"window-1",2)).toHaveLength(2);
    expect(hasFortuneCompanySignal({
      company:"Amazon",
      jdText:"Backend engineering role.",
    },companies)).toBe(true);
  });
});
