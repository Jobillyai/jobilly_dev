export function getApifyToken(): string | null {
  return (
    process.env.APIFY_API_TOKEN?.trim() ||
    process.env.APIFY_KEY?.trim() ||
    null
  );
}
