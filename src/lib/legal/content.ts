export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  title: string;
  titleEm: string;
  subtitle: string;
  effectiveDate: string;
  sections: LegalSection[];
};

export const privacyPolicy: LegalDocument = {
  title: "Privacy",
  titleEm: "Policy",
  subtitle:
    "A detailed explanation of what data Jobilly.ai collects, how it flows through our platform, how long we keep it, and the controls you have over your information.",
  effectiveDate: "June 17, 2026",
  sections: [
    {
      id: "overview",
      title: "Overview",
      paragraphs: [
        "Jobilly.ai (“Jobilly,” “we,” “us”) is an AI-powered career acceleration platform built for fresh graduates and postgraduate students. Our platform connects candidates with mentors, learning content, mock interviews, and managed job application support through a single integrated experience.",
        "Because Jobilly handles résumés, career profiles, interview responses, application history, and in some cases sensitive employment-related information, we treat privacy as a core product requirement rather than a legal afterthought. This Privacy Policy describes, in detail, the categories of personal data we process, the purposes for which we use that data, the systems that store it, how access is restricted by role, and the rights available to you.",
        "This policy applies to our public marketing website, candidate dashboard, employee and admin tools, institution portals, transactional emails, and any related services that link to this page.",
      ],
    },
    {
      id: "who-this-applies-to",
      title: "Who this policy applies to",
      paragraphs: [
        "Jobilly serves four primary user types, and the data we collect depends on which experience you use. Free candidates register to access career advisory and free learning content; subscribed candidates additionally use mock interviews and our Job Application Service. Institution candidates access advisory, learning, and interviews through a partner university or employer subscription. Jobilly employees, mentors, managers, and admins access internal tools to support candidates, review applications, and operate the platform.",
        "If you interact with Jobilly only as a website visitor without creating an account, we still collect limited technical data such as browser information and pages viewed, as described below. If you are an institution administrator, we also process data needed to manage your organization’s subscription, roster, and reporting.",
      ],
    },
    {
      id: "account-identity",
      title: "Account and identity data",
      paragraphs: [
        "When you create an account, we collect your email address, name (including first and last name where provided), and authentication credentials. You may sign up with email and password or through OAuth providers such as Google. Supabase Auth manages authentication on our behalf and issues secure session tokens used to keep you signed in.",
        "We assign each user an internal user identifier and, where applicable, a member ID used across the platform. For employees and admins, we may enable multi-factor authentication and record whether MFA is enabled on the account. We store your account role (for example free candidate, subscribed candidate, employee, admin, manager, institution admin, or institution candidate), which determines which features and data you can access.",
        "We record when your account was created and may log sign-in events, password reset requests, and security-related account changes. We do not store your raw password in readable form; credentials are handled by our authentication provider using industry-standard hashing and security practices.",
      ],
    },
    {
      id: "profile-career",
      title: "Profile and career data",
      paragraphs: [
        "Your candidate profile holds the career information you provide and that we use to personalize services. This may include education level, graduation college, graduation year, specialization or branch, skills, technology interests, career goals, desired job search role, years of experience, work experience descriptions, gender where you choose to provide it, LinkedIn profile URL, and résumé files uploaded to Supabase Storage.",
        "Résumé files are stored in encrypted object storage and linked to your profile by URL. When you use our Job Application Service, mentors and assigned recruiters may use your résumé and profile data to tailor applications, draft cover letters, and match you with relevant roles. Your profile also records subscription status, the Jobilly employee assigned to support you (if any), and timestamps showing when profile information was last updated.",
        "If you complete a career advisory intake form, we collect additional details such as phone number (including country code), preferred technologies, career path interests, and any other fields you submit through that workflow. This information helps mentors prepare for advisory sessions and recommend learning paths.",
      ],
    },
    {
      id: "advisory-learning",
      title: "Career advisory and Growth School data",
      paragraphs: [
        "When you book or attend a career advisory session, we store session metadata including scheduled date and time, assigned mentor, session status, meeting link, mentor notes, and any recommended learning path linked to the session. Calendar integrations may receive enough information to schedule the meeting, such as your name, email, and session time.",
        "Growth School collects learning progress data as you move through paths, modules, and lessons. We record which lessons you have started or completed, watch percentage for video lessons, quiz attempts including your answers and scores, pass or fail outcomes, and sandbox coding challenge submissions including the code you write and automated test results. Quiz and lesson content may use vector embeddings stored in our database to power similarity search and personalized evaluation, but these embeddings are derived from content and questions rather than raw personal identifiers.",
        "We cache AI-generated lesson videos and scripts so that content can be served efficiently to many users. Your individual progress records are tied to your user account and are not shared with other candidates except in aggregated institution reporting where applicable.",
      ],
    },
    {
      id: "mock-interviews",
      title: "Mock interview and voice data",
      paragraphs: [
        "Mock interviews may use voice or text interaction with AI-powered interviewers configured with company-specific personas. Before any voice-based session, we present an explicit consent screen explaining that the session involves voice processing and describing what we retain.",
        "We do not store raw voice recordings by default. During a live session, audio may be streamed to speech-to-text and text-to-speech providers for real-time transcription and interviewer responses, but those streams are processed for the session rather than archived as audio files. After the session, we may store the interview transcript, structured scorecard, company and role context, round type, and AI-generated feedback to help you review performance and track improvement over time.",
        "You may also submit post-interview feedback describing real questions you encountered elsewhere, difficulty, and outcome notes. This feedback helps enrich our interview question database and improve future sessions. You can request deletion of interview transcripts associated with your account, subject to legal and operational retention limits described below.",
      ],
    },
    {
      id: "job-applications",
      title: "Job Application Service data",
      paragraphs: [
        "Subscribed candidates using the Job Application Service provide data used to search for roles and submit applications on their behalf. This includes your active subscription plan, start and end dates, assigned recruiter, subscription status, and a separate application profile containing job search preferences such as preferred locations, salary expectations, and remote work preference.",
        "Certain application profile fields are considered sensitive because they may relate to visa status, disability, or similar employment-related attributes. These fields are encrypted before being written to the database and are visible only to the recruiter assigned to your account, not to other candidates or unauthorized staff. Every access to sensitive application data by Jobilly employees is intended to be logged in our audit system.",
        "For each job we apply to on your behalf, we store the company name, role title, job posting URL, application date, current status (such as queued, applied, interviewing, rejected, or offered), tailored résumé file URL, and cover letter text. Employees may also run job discovery workflows that store scraped job listings linked to your account, including job description text and relevance scores, along with records of which listings were selected for application.",
        "Recruiter messages between you and your assigned Jobilly employee are stored with sender role, message content, and timestamp so that application support remains documented and auditable.",
      ],
    },
    {
      id: "institution-data",
      title: "Institution and partner data",
      paragraphs: [
        "Partner universities and employers may subscribe to Jobilly for cohorts of students or employees. Institution records include organization name, branding assets such as logo URL and primary color, subdomain configuration, subscription plan, and designated institution admin users.",
        "When you join through an institution, we link your user account to that institution and record enrollment date. Institution administrators may view progress and usage reports for candidates in their program, such as lesson completion, interview activity, and advisory participation, as authorized by the institution agreement. Institution admins do not receive access to sensitive application profile fields unless explicitly permitted by product configuration and law.",
      ],
    },
    {
      id: "payments",
      title: "Payment and billing data",
      paragraphs: [
        "Individual subscriptions and institution billing are processed through Stripe. When you subscribe, Stripe collects payment card details and billing address directly; Jobilly receives subscription identifiers, payment status, plan type, and billing period information needed to activate and maintain your access. We do not store full payment card numbers on our servers.",
        "We retain records of your subscription history, invoices where applicable, and correspondence related to billing disputes or refunds for as long as needed for accounting, tax, and legal compliance.",
      ],
    },
    {
      id: "usage-analytics",
      title: "Usage, device, and analytics data",
      paragraphs: [
        "When you use Jobilly, we automatically collect technical and usage information to operate, secure, and improve the platform. This includes pages and features accessed, clicks and navigation paths, approximate geographic location derived from IP address, browser type and version, device type, operating system, referral source, and timestamps of activity.",
        "We use privacy-conscious product analytics (such as PostHog) to understand funnels like free-to-paid conversion, lesson completion rates, and interview completion rates. Analytics are configured to minimize unnecessary personal identification and to support product decisions rather than third-party advertising profiles.",
        "Server logs, error reports, and performance metrics may include request URLs, response times, error stack traces, and anonymized or pseudonymous identifiers tied to your session. Error monitoring tools such as Sentry help us detect and fix bugs quickly. Structured logs in systems like Axiom or Better Stack support security investigations and operational troubleshooting.",
      ],
    },
    {
      id: "communications",
      title: "Communications and support data",
      paragraphs: [
        "If you contact us through our contact form, support email, or in-product messaging, we retain the content of your message along with your name, email, phone number if provided, and any attachments needed to resolve your request. Transactional emails sent through providers such as Resend include delivery metadata and may record open or click events where enabled.",
        "We send service-related emails such as account verification, password reset, session invitations, application status updates, and security alerts. You cannot opt out of essential transactional messages while maintaining an active account, but you may opt out of non-essential marketing communications where offered.",
      ],
    },
    {
      id: "how-we-use",
      title: "How we use your information",
      paragraphs: [
        "We use account and identity data to authenticate you, enforce role-based access across candidate, employee, admin, and institution experiences, and protect accounts from unauthorized access. Profile and career data power personalization including job recommendations, learning path suggestions, résumé tailoring, and mentor preparation for advisory sessions.",
        "Learning and interview data enable us to track your progress, generate feedback, improve question banks, and measure whether our content helps candidates prepare for real hiring processes. Job Application Service data is used exclusively to discover relevant roles, prepare application materials, submit applications with your authorization, and communicate status updates between you and your assigned recruiter.",
        "Usage and analytics data help us understand which features deliver value, detect abuse or automated scraping, maintain rate limits, diagnose latency issues (especially for voice interviews where we target sub-two-second response times), and plan infrastructure capacity. We also process data where necessary to comply with applicable law, respond to valid legal requests, enforce our Terms of Service, and protect the safety and rights of Jobilly, our users, and the public.",
      ],
    },
    {
      id: "ai-processing",
      title: "AI and automated processing",
      paragraphs: [
        "Jobilly uses artificial intelligence throughout the platform. Large language models such as Anthropic Claude may generate learning content, evaluate quiz answers, produce interview feedback, tailor résumés and cover letters, and score job relevance. Embedding models convert text into vector representations stored in PostgreSQL with pgvector to power retrieval-augmented generation for lessons, quizzes, and interview questions.",
        "Voice interviews may invoke streaming speech-to-text (such as Deepgram), streaming text-to-speech (such as ElevenLabs), and real-time audio transport (such as WebRTC via Daily.co). Video lessons may be generated through services such as HeyGen and cached for reuse. Code sandbox challenges may execute in isolated environments such as Judge0 on separate worker infrastructure so that candidate code never runs on the main application server.",
        "Automated processing may produce scores, rankings, or suggestions that influence what jobs, lessons, or interview questions you see. These outputs are assistive rather than determinative — mentors and recruiters review important decisions, and you should verify AI-generated content before relying on it for employment or legal decisions. You may contact us to learn more about how automated processing affects your account.",
      ],
    },
    {
      id: "legal-bases",
      title: "Legal bases for processing",
      paragraphs: [
        "Where the General Data Protection Regulation (GDPR) or similar laws apply, we process personal data on one or more of the following bases. We process data necessary to perform our contract with you — for example, operating your account, delivering subscribed services, and submitting job applications you authorize. We process data based on legitimate interests where those interests are not overridden by your rights, including platform security, fraud prevention, product improvement, and internal reporting.",
        "We rely on consent where required by law, such as before voice-based mock interviews or certain optional marketing communications. You may withdraw consent at any time without affecting the lawfulness of processing before withdrawal. We also process data when necessary to comply with legal obligations, such as tax record retention or responses to lawful government requests.",
      ],
    },
    {
      id: "sharing",
      title: "How we share information",
      paragraphs: [
        "Jobilly does not sell your personal information to data brokers or advertisers. We share data only with service providers that help us deliver the platform, under contracts that require confidentiality and appropriate security measures.",
        "Infrastructure providers include Supabase (managed PostgreSQL database, authentication, and file storage), Vercel (frontend hosting), Railway or Fly.io (background workers for scraping, interview processing, and video callbacks), Cloudflare (CDN, WAF, and bot protection), and Upstash Redis (caching and rate limiting). AI and media providers include Anthropic, OpenAI (embeddings), Deepgram, ElevenLabs, Daily.co, HeyGen, and Apify (employee-triggered job scraping). Operational tools include Stripe (payments), Resend (email), Cal.com (scheduling), Sentry (error monitoring), Axiom or Better Stack (logs and uptime), PostHog (analytics), and Doppler or Infisical (secrets management).",
        "Assigned Jobilly mentors, recruiters, and admins may access your data when needed to perform services you request, subject to role restrictions and audit logging. Partner institutions receive reporting on enrolled candidates as described in their agreement. We may disclose information if required by law, court order, or governmental authority, or when we believe disclosure is necessary to protect rights, safety, or property. If Jobilly is involved in a merger, acquisition, or sale of assets, your data may transfer to the successor entity subject to continued protection consistent with this policy.",
      ],
    },
    {
      id: "security",
      title: "Security and data protection",
      paragraphs: [
        "Our security model follows defence in depth so that no single layer failure exposes user data. At the edge, Cloudflare provides WAF rules to block common attacks, rate limiting, bot mitigation, and DDoS protection. All traffic uses TLS 1.3 encryption in transit with HSTS enforced.",
        "At the application layer, every input is validated (for example with Zod schemas), outputs are encoded to reduce cross-site scripting risk, CSRF protections are applied, and security headers including Content Security Policy are set. Authentication uses Supabase Auth with secure session tokens; employees and admins may use multi-factor authentication.",
        "Authorization is enforced at the database level through Row-Level Security policies in PostgreSQL, meaning a candidate cannot read another candidate’s rows even if application code contains a bug. Sensitive application fields are encrypted before storage. Secrets and API keys live in a dedicated secrets manager and are injected at runtime — never committed to source code.",
        "Employee access to candidate profiles and sensitive fields is logged in an audit_log table recording the actor, action, target, timestamp, and IP address where available. Dependencies are scanned automatically in CI, and candidate code runs in isolated sandbox environments separate from production networks.",
      ],
    },
    {
      id: "retention",
      title: "Data retention",
      paragraphs: [
        "We retain personal data for as long as your account is active and as needed to provide the services you use. Profile information, résumés, learning progress, interview transcripts, application history, and recruiter messages remain available while your account exists unless you request deletion of specific items or your entire account.",
        "If you delete your account or request erasure, we will delete or anonymize personal data within a reasonable period, except where retention is required for legal, tax, accounting, or dispute resolution purposes. Backup systems may retain deleted data for a limited window before backups rotate and overwrite.",
        "Security logs, audit records, and aggregated analytics may be kept longer in de-identified or pseudonymized form to maintain platform integrity and comply with security obligations. Subscription and payment records may be retained for the period required by financial regulations.",
      ],
    },
    {
      id: "rights",
      title: "Your rights and choices",
      paragraphs: [
        "Depending on your location, you may have the right to access a copy of the personal data we hold about you, correct inaccurate or incomplete information through your profile settings or by contacting us, delete your account and associated data subject to legal exceptions, export your data in a portable machine-readable format where technically feasible, restrict or object to certain processing, withdraw consent for consent-based processing, and lodge a complaint with your local data protection supervisory authority.",
        "Jobilly provides GDPR-style data export and deletion capabilities designed into the platform architecture. To submit a request, email privacy@jobilly.ai or use jobilly.ai/contact. We may need to verify your identity before fulfilling requests. We will respond within the timeframe required by applicable law, typically within thirty days for GDPR requests.",
        "You can update much of your profile and career data directly in the candidate dashboard. You may cancel subscriptions through your account or Stripe customer portal where available. Institution candidates should contact their institution admin for program-specific questions in addition to Jobilly.",
      ],
    },
    {
      id: "international",
      title: "International data transfers",
      paragraphs: [
        "Jobilly is operated from the United States and uses service providers that may process data in the United States, European Union, and other countries. When we transfer personal data across borders, we implement appropriate safeguards such as Standard Contractual Clauses approved by the European Commission, supplementary measures where required, and vendor assessments for security and privacy practices.",
        "If you access Jobilly from outside the United States, you acknowledge that your data may be processed in jurisdictions with different data protection laws than your country of residence, but we apply consistent protections described in this policy regardless of processing location.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies and similar technologies",
      paragraphs: [
        "We use cookies and similar storage technologies to maintain your authenticated session, remember preferences, protect against cross-site request forgery, and measure product usage. Essential cookies are required for the platform to function; analytics cookies help us understand feature adoption and may be configurable depending on your jurisdiction.",
        "You can control cookies through your browser settings, but disabling essential session cookies will prevent you from staying signed in. We do not use cookies for third-party advertising networks.",
      ],
    },
    {
      id: "children",
      title: "Children",
      paragraphs: [
        "Jobilly is designed for graduates and adult learners, not children. We do not knowingly collect personal information from anyone under 16 years of age. If you believe a child has provided us personal data, please contact privacy@jobilly.ai and we will take steps to delete that information promptly.",
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy as our services, data practices, or legal requirements change. When we make material changes, we will post the updated policy on this page with a revised effective date and, where appropriate, notify you by email or through an in-product notice. We encourage you to review this page periodically.",
      ],
    },
    {
      id: "contact",
      title: "Contact us",
      paragraphs: [
        "For privacy questions, data access requests, deletion requests, or concerns about how your information is handled, contact Jobilly.ai — Privacy at privacy@jobilly.ai or through jobilly.ai/contact. We take all privacy inquiries seriously and will work with you to resolve them.",
      ],
    },
  ],
};

export const termsOfService: LegalDocument = {
  title: "Terms of",
  titleEm: "Service",
  subtitle:
    "The rules for using Jobilly.ai, including how your data is handled across subscriptions, AI features, managed applications, and institution programs.",
  effectiveDate: "June 17, 2026",
  sections: [
    {
      id: "agreement",
      title: "Agreement to terms",
      paragraphs: [
        "These Terms of Service (“Terms”) govern your access to and use of Jobilly.ai, including our website, candidate dashboard, employee and admin tools, institution features, APIs, and related services (collectively, the “Platform”).",
        "By creating an account, signing in, or using the Platform, you agree to these Terms and our Privacy Policy, which describes in detail the categories of data we collect and how we process them. If you do not agree, you must not use Jobilly.",
      ],
    },
    {
      id: "services",
      title: "Our services",
      paragraphs: [
        "Jobilly provides an integrated career platform for graduates and postgraduate students. Career Advisory offers mentor-led sessions to help you choose career paths and technology stacks. Growth School delivers AI-assisted learning with video lessons, quizzes, and sandbox coding challenges powered by retrieval-augmented generation. Mock Interviews provide voice or text-based practice with company-specific AI personas and structured feedback. The Job Application Service is a subscription offering where authorized Jobilly staff apply to jobs on your behalf using your profile, résumé, and application preferences.",
        "Partner institutions may enroll cohorts of students or employees with tailored access levels — for example, institution candidates may receive advisory, learning, and interviews without the Job Application Service depending on the institution plan. Feature availability, storage limits, and support levels depend on your account type: free candidate, subscribed candidate, institution candidate, institution admin, or internal Jobilly staff.",
        "Some features may be labeled beta or preview. We may add, modify, or discontinue features with reasonable notice where practicable. The Platform is not a guarantee of employment, admission, visa approval, or any particular career outcome.",
      ],
    },
    {
      id: "data-you-provide",
      title: "Data you provide to us",
      paragraphs: [
        "To use Jobilly effectively, you provide personal and career-related data including your name, email, phone number, education history, skills, career goals, résumé files, LinkedIn URL, interview responses, quiz answers, coding submissions, and job search preferences. If you use the Job Application Service, you may also provide sensitive employment-related information such as visa status or disability status where relevant to applications; this data is encrypted and accessible only to your assigned recruiter as described in our Privacy Policy.",
        "You represent that all information you submit is accurate, current, and complete to the best of your knowledge. You are responsible for updating your profile when your circumstances change — for example, work authorization status, contact details, or résumé content. Inaccurate data may result in incorrect applications, poor job matches, or account suspension.",
        "By uploading content such as résumés, cover letter drafts, or interview answers, you grant Jobilly a limited license to store, process, display to authorized staff, transmit to employers when you request applications, and use in anonymized or aggregated form to improve our services, consistent with the Privacy Policy.",
      ],
    },
    {
      id: "accounts",
      title: "Accounts and eligibility",
      paragraphs: [
        "You must provide accurate registration information and maintain the security of your credentials. You are responsible for all activity that occurs under your account. Notify us immediately at legal@jobilly.ai if you suspect unauthorized access.",
        "You must be at least 16 years old and legally able to enter a binding agreement. Institution administrators represent that they have authority to enroll and manage candidates on behalf of their organization and that they will handle candidate data in compliance with applicable law and their institution’s agreement with Jobilly.",
        "We may suspend or terminate accounts that violate these Terms, submit fraudulent information, attempt to bypass security controls including Row-Level Security, harass staff or other users, or pose a security or legal risk to Jobilly or third parties.",
      ],
    },
    {
      id: "subscriptions",
      title: "Subscriptions and payments",
      paragraphs: [
        "Paid features require an active individual subscription processed through Stripe or coverage under an institution plan. Fees, billing intervals, renewal terms, and included services are displayed at purchase. Subscriptions renew automatically unless cancelled before the renewal date.",
        "Except where required by applicable consumer protection law, fees are non-refundable once a billing period has begun. You may cancel future renewals through your account settings or the Stripe customer portal. Upon cancellation, you retain access through the end of the paid period unless otherwise stated.",
        "We may change pricing or plan features with advance notice before changes apply to subsequent billing cycles. Continued use after a price change constitutes acceptance of the new pricing for renewal periods.",
      ],
    },
    {
      id: "managed-applications",
      title: "Managed job applications",
      paragraphs: [
        "When you subscribe to the Job Application Service, you authorize Jobilly recruiters to search for roles, prepare tailored résumés and cover letters, and submit applications to employers on your behalf using the data in your profile and application profile. You acknowledge that applications will represent you to third-party employers and that you remain legally responsible for the accuracy of submitted information.",
        "Jobilly does not guarantee interviews, callbacks, offers, or employment. Hiring decisions rest entirely with employers. We may decline to apply to roles we believe are inappropriate, misaligned with your profile, or potentially fraudulent, but we are not liable for employer conduct, ghosting, or discriminatory hiring practices.",
        "You must promptly notify your assigned recruiter if an application was submitted in error, if you accept another offer, or if your visa status, work authorization, or availability changes. Failure to provide timely updates may result in applications you no longer want.",
      ],
    },
    {
      id: "ai-content",
      title: "AI-generated content and data processing",
      paragraphs: [
        "Jobilly relies extensively on artificial intelligence. Learning materials, quiz evaluations, interview questions, feedback, résumé suggestions, cover letter drafts, job relevance scores, and scraped job summaries may be generated or assisted by AI models from providers such as Anthropic Claude, OpenAI embeddings, Deepgram, ElevenLabs, and others described in our Privacy Policy.",
        "AI output can be incomplete, outdated, biased, or factually incorrect. You must review all AI-generated content before submitting it to employers, relying on it for academic credit, or using it for immigration or legal purposes. Jobilly is not a licensed career counselor, staffing agency, law firm, or immigration adviser.",
        "Voice mock interviews require your explicit consent before sessions begin. Raw audio is not stored by default; transcripts and scorecards may be retained to provide feedback. You may request deletion of interview transcripts subject to the retention rules in our Privacy Policy.",
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      paragraphs: [
        "You agree to use Jobilly only for lawful career development and job search purposes. You may not misrepresent your identity, qualifications, work authorization, or employment history in profiles, applications, or interviews facilitated through the Platform.",
        "You may not upload malware, attempt to scrape or harvest data from the Platform without permission, probe or circumvent authentication or Row-Level Security controls, interfere with other users’ sessions, or use automated tools to create accounts or generate excessive load on our infrastructure.",
        "You may not harass, threaten, or discriminate against mentors, recruiters, staff, or other users. You may not reverse engineer, copy, resell, or commercially exploit the Platform or its content except as expressly permitted in writing by Jobilly.",
      ],
    },
    {
      id: "ip",
      title: "Intellectual property",
      paragraphs: [
        "Jobilly owns the Platform software, branding, design, documentation, and original content we create, including AI-generated lesson materials produced for the service. You receive a personal, limited, non-exclusive, non-transferable, revocable license to access and use the Platform according to these Terms.",
        "You retain ownership of content you upload, including résumés and personal writing. You represent that you have the necessary rights to share uploaded content with Jobilly and with third-party employers when you request job applications, and that your content does not infringe any third party’s intellectual property or privacy rights.",
      ],
    },
    {
      id: "privacy",
      title: "Privacy and data security",
      paragraphs: [
        "Our Privacy Policy is incorporated into these Terms by reference and explains in detail what data we collect across account registration, candidate profiles, career advisory intakes, learning progress, mock interviews, job applications, institution reporting, payments, analytics, and support communications.",
        "Jobilly implements technical and organizational measures including Supabase Auth, Row-Level Security, encryption in transit and at rest, encrypted storage for sensitive application fields, audit logging of employee access, Cloudflare WAF protection, secrets management, and isolated code execution sandboxes. No security system is perfect; you use the Platform at your own risk and should protect your account credentials.",
        "Institution administrators must access candidate data only for legitimate educational or employment-support purposes authorized by their institution agreement. Unauthorized disclosure of candidate data by institution users may result in termination of access and legal consequences.",
      ],
    },
    {
      id: "third-parties",
      title: "Third-party services",
      paragraphs: [
        "The Platform integrates with third-party services for authentication, payments, email, scheduling, AI processing, job boards, analytics, and infrastructure as listed in our Privacy Policy. Your use of certain integrations may be subject to those providers’ terms and privacy policies in addition to ours.",
        "Jobilly displays links to external job postings, employer websites, and partner resources for convenience. We do not control and are not responsible for the content, privacy practices, or hiring decisions of third parties.",
      ],
    },
    {
      id: "disclaimers",
      title: "Disclaimers",
      paragraphs: [
        "THE PLATFORM IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, JOBILLY DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY OF AI OUTPUT, AND NON-INFRINGEMENT.",
        "We do not warrant uninterrupted, secure, or error-free operation, that defects will be corrected, or that AI-generated recommendations will result in employment. Data loss despite our backup practices remains a risk inherent in any cloud service.",
      ],
    },
    {
      id: "liability",
      title: "Limitation of liability",
      paragraphs: [
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, JOBILLY AND ITS OFFICERS, DIRECTORS, EMPLOYEES, CONTRACTORS, AND SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR EMPLOYMENT OPPORTUNITIES, ARISING FROM YOUR USE OF OR INABILITY TO USE THE PLATFORM.",
        "OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM IS LIMITED TO THE GREATER OF (A) THE AMOUNTS YOU PAID JOBILLY IN THE TWELVE MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (USD $100), EXCEPT WHERE SUCH LIMITATIONS ARE PROHIBITED BY APPLICABLE LAW.",
      ],
    },
    {
      id: "indemnity",
      title: "Indemnification",
      paragraphs: [
        "You agree to defend, indemnify, and hold harmless Jobilly and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable legal fees) arising out of your use of the Platform, your submitted content, your violation of these Terms, your violation of any third-party rights, or inaccurate information included in job applications submitted on your behalf.",
      ],
    },
    {
      id: "changes-terms",
      title: "Changes",
      paragraphs: [
        "We may modify these Terms from time to time. Updated Terms will be posted on this page with a revised effective date. Material changes may be communicated by email or in-product notice. Your continued use of the Platform after changes take effect constitutes acceptance, except where applicable law requires your explicit consent.",
      ],
    },
    {
      id: "governing-law",
      title: "Governing law",
      paragraphs: [
        "These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict-of-law principles, except where mandatory consumer protection laws in your country of residence provide otherwise.",
        "Before initiating formal legal proceedings, you agree to contact us at legal@jobilly.ai to attempt informal resolution. Where permitted by law, exclusive jurisdiction for disputes shall lie in the state or federal courts located in Delaware.",
      ],
    },
    {
      id: "contact-terms",
      title: "Contact",
      paragraphs: [
        "For questions about these Terms, data handling, or account issues, contact Jobilly.ai — Legal at legal@jobilly.ai or through jobilly.ai/contact.",
      ],
    },
  ],
};
