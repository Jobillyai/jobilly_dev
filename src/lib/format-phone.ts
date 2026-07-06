export type PhoneCountry = "us" | "in";

export const PHONE_COUNTRIES = [
  { code: "us" as const, dialCode: "+1", label: "USA" },
  { code: "in" as const, dialCode: "+91", label: "IND" },
] as const;

export function getPhoneDialCode(country: PhoneCountry): string {
  return country === "in" ? "+91" : "+1";
}

export function splitPhoneNumber(fullPhone: string | undefined | null): {
  country: PhoneCountry;
  localNumber: string;
} {
  const digits = (fullPhone ?? "").replace(/\D/g, "");

  if (digits.startsWith("91") && digits.length > 10) {
    return {
      country: "in",
      localNumber: digits.slice(2),
    };
  }

  if (digits.startsWith("1") && digits.length === 11) {
    return {
      country: "us",
      localNumber: digits.slice(1),
    };
  }

  return {
    country: "us",
    localNumber: digits,
  };
}

export function formatPhoneNumber(country: PhoneCountry, localNumber: string): string {
  const digits = localNumber.replace(/\D/g, "");
  return `${getPhoneDialCode(country)} ${digits}`;
}
