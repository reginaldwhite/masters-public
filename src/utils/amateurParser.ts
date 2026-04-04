/**
 * Parse a newline-separated list of amateur player names.
 */
export function parseAmateurs(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
