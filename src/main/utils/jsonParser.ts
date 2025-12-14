export async function safeParseJSON<T = any>(
  str: string | Promise<string>,
): Promise<T | null> {
  try {
    const resolved = await str;
    return JSON.parse(resolved);
  } catch {
    return null;
  }
}
