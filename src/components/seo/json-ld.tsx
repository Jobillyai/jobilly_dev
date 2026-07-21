import {
  SITE_DEFAULT_DESCRIPTION,
  SITE_FAQS,
  SITE_LEGAL_NAME,
  SITE_LINKEDIN_URL,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_SUPPORT_EMAIL,
  SITE_TAGLINE,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo/site";

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        legalName: SITE_LEGAL_NAME,
        url: SITE_URL,
        logo: SITE_OG_IMAGE,
        description: SITE_DEFAULT_DESCRIPTION,
        email: SITE_SUPPORT_EMAIL,
        sameAs: [SITE_LINKEDIN_URL],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: SITE_SUPPORT_EMAIL,
            url: absoluteUrl("/contact"),
            availableLanguage: ["English"],
          },
        ],
      }}
    />
  );
}

export function WebsiteJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        alternateName: ["Jobilly", "Jobilly AI"],
        url: SITE_URL,
        description: SITE_DEFAULT_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-US",
      }}
    />
  );
}

export function FaqJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${absoluteUrl("/faq")}#faq`,
        url: absoluteUrl("/faq"),
        mainEntity: SITE_FAQS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }}
    />
  );
}

/** Organization + WebSite + FAQ structured data for public marketing pages. */
export function SiteJsonLd() {
  return (
    <>
      <OrganizationJsonLd />
      <WebsiteJsonLd />
      <FaqJsonLd />
      {/* Keep a visible-to-crawlers semantic hint via slogan in WebSite-adjacent Offer catalog */}
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: SITE_NAME,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: SITE_URL,
          description: `${SITE_TAGLINE}. ${SITE_DEFAULT_DESCRIPTION}`,
          offers: {
            "@type": "AggregateOffer",
            lowPrice: "79.99",
            highPrice: "149.99",
            priceCurrency: "USD",
            offerCount: 3,
          },
          publisher: { "@id": `${SITE_URL}/#organization` },
        }}
      />
    </>
  );
}
