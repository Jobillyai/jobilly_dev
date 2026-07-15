"use client";

import { useState, useTransition } from "react";
import { Check, CreditCard, ShieldCheck, Sparkles, X } from "lucide-react";
import {
  formatPlanPriceMonthly,
  getPremiumPlan,
  premiumPlans,
  type PremiumPlanId,
} from "@/lib/candidate-services";
import {
  completeMockCheckoutAction,
  type MockCheckoutState,
} from "@/server/actions/candidate-plans";
import styles from "./candidate-plans.module.css";

type CandidatePlansProps = {
  initialPlanId: PremiumPlanId;
  openCheckoutInitially: boolean;
  currentPlanId: PremiumPlanId | null;
  candidateName: string;
  candidateEmail: string;
};

const initialState: MockCheckoutState = {};

export function CandidatePlans({
  initialPlanId,
  openCheckoutInitially,
  currentPlanId,
  candidateName,
  candidateEmail,
}: CandidatePlansProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<PremiumPlanId>(initialPlanId);
  const [activePlanId, setActivePlanId] = useState<PremiumPlanId | null>(currentPlanId);
  const [checkoutOpen, setCheckoutOpen] = useState(
    !currentPlanId && openCheckoutInitially,
  );
  const [state, setState] = useState<MockCheckoutState>(initialState);
  const [pending, startTransition] = useTransition();

  const currentPlan = activePlanId ? getPremiumPlan(activePlanId) : null;
  const selectedPlan = getPremiumPlan(selectedPlanId)!;
  const availablePlans = currentPlan
    ? currentPlan.id === "mock-and-job"
      ? []
      : premiumPlans.filter((plan) => plan.id === "mock-and-job")
    : premiumPlans;

  function startCheckout(planId: PremiumPlanId) {
    setSelectedPlanId(planId);
    setState({});
    setCheckoutOpen(true);
  }

  function submitCheckout(formData: FormData) {
    startTransition(async () => {
      const result = await completeMockCheckoutAction(state, formData);
      setState(result);
      if (result.success && result.plan) {
        setActivePlanId(result.plan);
      }
    });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Plans & services</span>
        <h1>Choose the support you need</h1>
        <p>
          Select a plan, enter billing details, and complete the mock payment.
          No real charge or card information is collected.
        </p>
      </header>

      {currentPlan ? (
        <section className={styles.currentSection}>
          <div className={styles.currentBadge}>
            <ShieldCheck size={16} /> Active plan
          </div>
          <h2>{currentPlan.title}</h2>
          <p>{currentPlan.description}</p>
          <strong>{formatPlanPriceMonthly(currentPlan.priceUsd)}</strong>
          <ul>
            {currentPlan.includes.map((item) => (
              <li key={item}>
                <Check size={15} /> {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {availablePlans.length > 0 ? (
        <section>
          <div className={styles.sectionHeading}>
            <h2>{currentPlan ? "Available upgrade" : "Available plans"}</h2>
            <p>
              {currentPlan
                ? "Add both premium services with the Full Bundle."
                : "You can activate one plan for this QA checkout."}
            </p>
          </div>
          <div className={styles.planGrid}>
            {availablePlans.map((plan) => (
              <article
                key={plan.id}
                className={`${styles.planCard} ${plan.featured ? styles.featured : ""}`}
              >
                {plan.featured ? <span className={styles.bestValue}>Best value</span> : null}
                <h3>{plan.title}</h3>
                <p className={styles.price}>{formatPlanPriceMonthly(plan.priceUsd)}</p>
                <p className={styles.description}>{plan.description}</p>
                <ul>
                  {plan.includes.slice(0, 5).map((item) => (
                    <li key={item}>
                      <Check size={14} /> {item}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => startCheckout(plan.id)}>
                  {currentPlan ? "Upgrade to Full Bundle" : "Select and pay"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className={styles.completePlan}>
          <Sparkles size={20} />
          You already have the complete Jobilly premium bundle.
        </div>
      )}

      {checkoutOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setCheckoutOpen(false)}
              aria-label="Close checkout"
            >
              <X size={20} />
            </button>

            {state.success ? (
              <div className={styles.success}>
                <div className={styles.successIcon}>
                  <Check size={30} />
                </div>
                <h2>Payment successful</h2>
                <p>
                  Your mock payment was approved and the{" "}
                  <strong>{selectedPlan.title}</strong> plan is now active.
                </p>
                <button type="button" onClick={() => setCheckoutOpen(false)}>
                  View my plan
                </button>
              </div>
            ) : (
              <>
                <div className={styles.modalHeader}>
                  <CreditCard size={22} />
                  <div>
                    <span>Mock checkout</span>
                    <h2 id="checkout-title">{selectedPlan.title}</h2>
                    <p>{formatPlanPriceMonthly(selectedPlan.priceUsd)}</p>
                  </div>
                </div>
                <div className={styles.mockNotice}>
                  QA mode — no real payment or card details are requested.
                </div>
                <form action={submitCheckout} className={styles.form}>
                  <input type="hidden" name="plan" value={selectedPlan.id} />
                  <CheckoutField
                    name="billingName"
                    label="Billing name"
                    defaultValue={candidateName}
                    error={state.fieldErrors?.billingName}
                  />
                  <CheckoutField
                    name="billingEmail"
                    type="email"
                    label="Billing email"
                    defaultValue={candidateEmail}
                    error={state.fieldErrors?.billingEmail}
                  />
                  <CheckoutField
                    name="billingPhone"
                    type="tel"
                    label="Phone number"
                    error={state.fieldErrors?.billingPhone}
                  />
                  <CheckoutField
                    name="addressLine1"
                    label="Billing address"
                    error={state.fieldErrors?.addressLine1}
                  />
                  <CheckoutField name="addressLine2" label="Apartment, suite (optional)" />
                  <div className={styles.formRow}>
                    <CheckoutField name="city" label="City" error={state.fieldErrors?.city} />
                    <CheckoutField name="state" label="State" error={state.fieldErrors?.state} />
                  </div>
                  <div className={styles.formRow}>
                    <CheckoutField
                      name="postalCode"
                      label="Postal code"
                      error={state.fieldErrors?.postalCode}
                    />
                    <CheckoutField
                      name="country"
                      label="Country"
                      defaultValue="United States"
                      error={state.fieldErrors?.country}
                    />
                  </div>
                  {state.error ? <p className={styles.formError}>{state.error}</p> : null}
                  <button type="submit" className={styles.payButton} disabled={pending}>
                    {pending ? "Processing mock payment…" : "Pay (mock)"}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}

function CheckoutField({
  name,
  label,
  type = "text",
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} />
      {error ? <small>{error}</small> : null}
    </label>
  );
}
