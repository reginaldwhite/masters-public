/**
 * Format a number as a dollar amount with commas.
 * e.g. 1234.5 → "$1,235"
 */
export function formatDollars(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('en-US');
}

/**
 * Format a fraction as a percentage string.
 * e.g. 0.073 → "7.3%"
 */
export function formatPercent(fraction: number): string {
  return (fraction * 100).toFixed(1) + '%';
}
