export function combineFirstLastName(
  firstName: string,
  lastName: string,
): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function splitFullName(fullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName?.trim() ?? "";
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0] ?? "", lastName: "" };
  }

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function getNameFromMetadata(
  metadata: Record<string, unknown> | undefined,
): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const metaFirst =
    typeof metadata?.first_name === "string" ? metadata.first_name.trim() : "";
  const metaLast =
    typeof metadata?.last_name === "string" ? metadata.last_name.trim() : "";

  if (metaFirst || metaLast) {
    return {
      firstName: metaFirst,
      lastName: metaLast,
      fullName: combineFirstLastName(metaFirst, metaLast),
    };
  }

  const legacyName =
    typeof metadata?.name === "string"
      ? metadata.name
      : typeof metadata?.full_name === "string"
        ? metadata.full_name
        : "";

  const split = splitFullName(legacyName);
  return {
    ...split,
    fullName: combineFirstLastName(split.firstName, split.lastName),
  };
}
