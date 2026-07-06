import type { PhoneCountry } from "@/lib/format-phone";

type FlagIconProps = {
  country: PhoneCountry;
  className?: string;
};

export function PhoneCountryFlag({ country, className }: FlagIconProps) {
  if (country === "in") {
    return (
      <svg
        className={className}
        viewBox="0 0 24 16"
        aria-hidden
      >
        <rect width="24" height="5.33" fill="#FF9933" />
        <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
        <rect y="10.67" width="24" height="5.33" fill="#138808" />
        <circle cx="12" cy="8" r="2.2" fill="#000080" />
        <circle cx="12" cy="8" r="1.6" fill="#FFFFFF" />
        <circle cx="12" cy="8" r="0.55" fill="#000080" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 16"
      aria-hidden
    >
      <rect width="24" height="16" fill="#B22234" />
      <rect y="1.23" width="24" height="1.23" fill="#FFFFFF" />
      <rect y="3.69" width="24" height="1.23" fill="#FFFFFF" />
      <rect y="6.15" width="24" height="1.23" fill="#FFFFFF" />
      <rect y="8.62" width="24" height="1.23" fill="#FFFFFF" />
      <rect y="11.08" width="24" height="1.23" fill="#FFFFFF" />
      <rect y="13.54" width="24" height="1.23" fill="#FFFFFF" />
      <rect width="9.6" height="8.62" fill="#3C3B6E" />
    </svg>
  );
}
