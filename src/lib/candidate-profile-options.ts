export const CANDIDATE_GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
] as const;

export const CANDIDATE_VISA_STATUS_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "us_citizen", label: "US Citizen" },
  { value: "green_card", label: "Green Card / Permanent Resident" },
  { value: "h1b", label: "H-1B" },
  { value: "opt_cpt", label: "OPT / CPT (F-1)" },
  { value: "l1", label: "L-1" },
  { value: "tn", label: "TN Visa" },
  { value: "ead", label: "EAD / Other work authorization" },
  { value: "needs_sponsorship", label: "Requires visa sponsorship" },
  { value: "not_authorized", label: "Not authorized to work in the US" },
] as const;

export function formatCandidateGender(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const match = CANDIDATE_GENDER_OPTIONS.find((option) => option.value === value);
  return match?.label ?? value;
}

export function formatCandidateVisaStatus(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const match = CANDIDATE_VISA_STATUS_OPTIONS.find((option) => option.value === value);
  return match?.label ?? value;
}

export function parseGraduationYear(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  if (parsed < 1950 || parsed > currentYear + 1) {
    return null;
  }

  return parsed;
}
