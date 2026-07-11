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
import shell from "./marketing-shell.module.css";

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
        className={plan.featured ? shell.btnPrimary : shell.btnSecondary}
      >
        {plan.ctaLabel} <ArrowRight size={16} aria-hidden />
      </Link>
    </article>
  );
}

export function CommunitiesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("communities");

  return (
    <div className={shell.page}>
      <section className={shell.hero}>
        <AbstractBackground />
        <div className={shell.heroContent}>
          <div className={shell.heroInner}>
            <p className={shell.heroEyebrow}>Member communities</p>
            <h1 className={shell.heroTitle}>
              Learn together. <span className={shell.brandWord}>Grow faster.</span>
            </h1>
            <p className={shell.heroSub}>
              Pick your lane: go all-in with Pro or stay in the loop with the free digest —
              accountability, mock interview rooms, and member-only sessions.
            </p>

            <div className={shell.heroActions}>
              <Link href="/signup" className={shell.btnPrimary}>
                Join Jobilly Pro
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="#communities" className={shell.btnSecondary}>
                Compare plans
              </Link>
            </div>

            <p className={shell.heroNote}>Free digest — no card required.</p>
          </div>
        </div>

        <div className={shell.statsBand}>
          <div className={shell.statItem}>
            <span className={shell.statValue}>{communityMemberCount}</span>
            <span className={shell.statLabel}>Members</span>
          </div>
          <div className={shell.statItem}>
            <span className={shell.statValue}>{communityPlans.length}</span>
            <span className={shell.statLabel}>Communities</span>
          </div>
          <div className={shell.statItem}>
            <span className={shell.statValue}>{communityStories.length}</span>
            <span className={shell.statLabel}>Success stories</span>
          </div>
          <div className={shell.statItem}>
            <span className={shell.statValue}>Pro</span>
            <span className={shell.statLabel}>Mock interview rooms</span>
          </div>
        </div>
      </section>

      <section id="communities" className={`${shell.section} ${styles.main}`}>
        <div className={shell.sectionContent}>
          <p className={shell.sectionLabel}>Communities</p>
          <h2 className={shell.sectionTitle}>Find your cohort</h2>

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
                  <h3 className={styles.storyTitle}>{story.title}</h3>
                  <p className={styles.storySummary}>{story.summary}</p>
                  {story.stat ? (
                    <p className={styles.storyStat}>{story.stat}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={shell.ctaSection}>
        <div className={shell.sectionContent}>
          <div className={shell.ctaInner}>
            <h2 className={shell.ctaTitle}>
              Want a community for
              <br />
              your university?
            </h2>
            <p className={shell.ctaSub}>
              We partner with universities and cohort leads. Tell us what you need and
              we will help you set up a chapter or group plan.
            </p>
            <div className={shell.ctaActions}>
              <Link href="/contact" className={shell.btnPrimary}>
                Get in touch
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/products" className={shell.btnSecondary}>
                View candidate plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
