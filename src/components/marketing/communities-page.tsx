"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sparkles, Users } from "lucide-react";
import { AbstractBackground } from "@/components/layout/abstract-background";
import {
  communityMemberCount,
  communityPlans,
  communityStories,
  formatCommunityPrice,
  type CommunityPlan,
} from "@/lib/community-plans";
import styles from "./communities-page.module.css";

type TabId = "communities" | "stories";

function PricingGrid({ plan }: { plan: CommunityPlan }) {
  if (plan.pricing.length === 1) {
    const tier = plan.pricing[0]!;
    return (
      <div className={styles.pricingSingle}>
        <span className={styles.pricingAmount}>{formatCommunityPrice(tier.priceUsd)}</span>
        {tier.priceUsd > 0 ? (
          <span className={styles.pricingPeriod}> / {tier.period}</span>
        ) : (
          <span className={styles.pricingPeriod}> {tier.period}</span>
        )}
      </div>
    );
  }

  return (
    <div className={styles.pricingGrid}>
      {plan.pricing.map((tier) => (
        <div key={tier.label} className={styles.pricingTier}>
          <span className={styles.pricingAmount}>{formatCommunityPrice(tier.priceUsd)}</span>
          <span className={styles.pricingPeriod}> / {tier.period}</span>
        </div>
      ))}
    </div>
  );
}

function CommunityCard({ plan }: { plan: CommunityPlan }) {
  return (
    <article
      className={`${styles.communityCard} ${plan.featured ? styles.communityCardFeatured : ""}`}
    >
      {plan.badge ? <span className={styles.cardBadge}>{plan.badge}</span> : null}

      <p className={styles.cardTagline}>{plan.tagline}</p>
      <h2 className={styles.cardTitle}>{plan.name}</h2>
      <p className={styles.cardDesc}>{plan.description}</p>

      <div className={styles.cardSection}>
        <h3 className={styles.cardSectionTitle}>What&apos;s included</h3>
        <ul className={styles.includedList}>
          {plan.included.map((item) => (
            <li key={item}>
              <Check size={16} strokeWidth={2.5} aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {plan.extras && plan.extras.length > 0 ? (
        <div className={styles.cardSection}>
          <h3 className={styles.cardSectionTitle}>
            <Sparkles size={16} aria-hidden />
            Jobilly-only perks
          </h3>
          <ul className={styles.extrasList}>
            {plan.extras.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.cardSection}>
        <h3 className={styles.cardSectionTitle}>Pricing</h3>
        <PricingGrid plan={plan} />
      </div>

      <Link
        href={plan.ctaHref}
        className={plan.featured ? styles.cardCtaPrimary : styles.cardCtaSecondary}
      >
        {plan.ctaLabel} <ArrowRight size={16} aria-hidden />
      </Link>
    </article>
  );
}

export function CommunitiesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("communities");

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <AbstractBackground />
        <div className={styles.heroInner}>
          <p className={styles.memberCount}>
            <Users size={16} aria-hidden />
            {communityMemberCount} members
          </p>
          <h1 className={styles.heroTitle}>Communities</h1>
          <p className={styles.heroSub}>
            Pick your lane: go all-in with Pro or just get the news with the free digest.
          </p>
        </div>
      </section>

      <section className={styles.main}>
        <div className={styles.mainInner}>
          <div className={styles.tabs} role="tablist" aria-label="Community sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "communities"}
              className={`${styles.tab} ${activeTab === "communities" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("communities")}
            >
              Communities
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "stories"}
              className={`${styles.tab} ${activeTab === "stories" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("stories")}
            >
              Success stories
            </button>
          </div>

          {activeTab === "communities" ? (
            <div className={styles.cardGrid}>
              {communityPlans.map((plan) => (
                <CommunityCard key={plan.id} plan={plan} />
              ))}
            </div>
          ) : (
            <div className={styles.storiesGrid}>
              {communityStories.map((story) => (
                <article key={story.id} className={styles.storyCard}>
                  <p className={styles.storyDate}>{story.date}</p>
                  <h2 className={styles.storyTitle}>{story.title}</h2>
                  <p className={styles.storySummary}>{story.summary}</p>
                  {story.stat ? (
                    <p className={styles.storyStat}>{story.stat}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}

          <div className={styles.bottomNote}>
            <p>
              Questions about chapters or group pricing?{" "}
              <Link href="/#contact" className={styles.bottomLink}>
                Contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
