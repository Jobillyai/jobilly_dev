export const JOB_CATEGORY_IDS = [
  "software_engineering", "frontend_development", "backend_development",
  "data_analysis", "data_engineering", "data_operations_technician",
  "data_center_technician", "it_support", "cloud_devops", "cybersecurity",
  "quality_assurance", "product_management", "design_ux",
  "electrical_electronics_technician", "mechanical_maintenance_technician",
  "medical_laboratory_technician", "other",
] as const;
export type JobCategoryId = (typeof JOB_CATEGORY_IDS)[number];
export const JOB_TAXONOMY_VERSION = "2026-07-v1";
export const JOB_CLASSIFIER_VERSION = "2026-07-v1";

export const JOB_CATEGORY_LABELS: Record<JobCategoryId, string> = {
  software_engineering:"Software Engineering", frontend_development:"Frontend Development",
  backend_development:"Backend Development", data_analysis:"Data Analysis",
  data_engineering:"Data Engineering", data_operations_technician:"Data Operations / Data Technician",
  data_center_technician:"Data Center / IT Infrastructure Technician", it_support:"IT Support",
  cloud_devops:"Cloud / DevOps", cybersecurity:"Cybersecurity", quality_assurance:"Quality Assurance",
  product_management:"Product Management", design_ux:"Design / UX",
  electrical_electronics_technician:"Electrical / Electronics Technician",
  mechanical_maintenance_technician:"Mechanical / Maintenance Technician",
  medical_laboratory_technician:"Medical / Laboratory Technician", other:"Other / Needs Review",
};
type Rule={id:JobCategoryId;title:RegExp;context?:RegExp};
const RULES:Rule[]=[
  // Specific IT technician titles must win before adjacent trade categories.
  {id:"data_center_technician",title:/\b(data\s*cent(?:er|re)|datacenter)\b.*\b(technician|engineer|operator|specialist)\b|\b(technician|engineer)\b.*\b(data\s*cent(?:er|re)|datacenter)\b/i,
    context:/\b(server|rack|network|hardware|cabling|infrastructure|linux|ticket|incident|data\s*cent(?:er|re))\b/i},
  {id:"electrical_electronics_technician",title:/\b(electronic|electronics|electrical|semiconductor|avionics)\b.*\b(technician|tech)\b|\b(technician|tech)\b.*\b(electronic|electronics|electrical)\b/i},
  {id:"mechanical_maintenance_technician",title:/\b(mechanical|maintenance|hvac|automotive|equipment|field service)\b.*\b(technician|tech)\b|\b(technician|tech)\b.*\b(mechanical|maintenance|hvac)\b/i},
  {id:"medical_laboratory_technician",title:/\b(medical|laboratory|lab|pharmacy|radiology|clinical)\b.*\b(technician|tech)\b/i},
  {id:"data_operations_technician",title:/\b(data|database|records|information processing)\b.*\b(technician|operator|specialist|processor|entry)\b|\b(technician|operator)\b.*\b(data|database|records)\b/i,
    context:/\b(data entry|database|records management|data quality|sql|spreadsheet|data processing)\b/i},
  {id:"frontend_development",title:/\b(front[\s-]?end|react|ui developer|web developer)\b/i},
  {id:"backend_development",title:/\b(back[\s-]?end|api developer|server[\s-]?side)\b/i},
  {id:"data_engineering",title:/\b(data engineer|etl developer|analytics engineer)\b/i},
  {id:"data_analysis",title:/\b(data analyst|business intelligence|bi analyst|reporting analyst)\b/i},
  {id:"cloud_devops",title:/\b(devops|cloud engineer|site reliability|sre|platform engineer)\b/i},
  {id:"cybersecurity",title:/\b(cyber|security analyst|soc analyst|information security)\b/i},
  {id:"quality_assurance",title:/\b(quality assurance|qa engineer|test engineer|software tester)\b/i},
  {id:"it_support",title:/\b(it support|help desk|desktop support|service desk)\b/i},
  {id:"product_management",title:/\b(product manager|product owner)\b/i},
  {id:"design_ux",title:/\b(ux|ui designer|product designer|user experience)\b/i},
  {id:"software_engineering",title:/\b(software engineer|software developer|application developer|programmer)\b/i},
];
export function detectJobCategory(title:string,description=""):{categoryId:JobCategoryId;confidence:number}{
  for(const rule of RULES){
    if(rule.title.test(title)&&(!rule.context||rule.context.test(`${title} ${description}`)))
      return {categoryId:rule.id,confidence:.96};
  }
  return {categoryId:"other",confidence:.25};
}
export type StrictJobIntent={canonicalSearchTitle:string;targetRoles:string[];categoryId:JobCategoryId;searchKeywords:string[];acceptedTitlePatterns:string[];excludedCategoryIds:JobCategoryId[];intentFingerprint:string};
export function strictJobMatchesIntent(job:{role:string;jdText?:string|null},intent:StrictJobIntent){
  const found=detectJobCategory(job.role,job.jdText??"");
  const titleAccepted=intent.acceptedTitlePatterns.length===0||
    intent.acceptedTitlePatterns.some(p=>job.role.toLowerCase().includes(p.toLowerCase()));
  return {accepted:found.categoryId===intent.categoryId&&titleAccepted&&!intent.excludedCategoryIds.includes(found.categoryId),detectedCategory:found.categoryId,confidence:found.confidence};
}
