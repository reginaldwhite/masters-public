interface ValueBadgeProps {
  evDollars: number;
  price: number;
}

export default function ValueBadge({ evDollars, price }: ValueBadgeProps) {
  if (price <= 0) return null;

  const ratio = evDollars / price;
  const display = ratio.toFixed(2) + '×';

  let bgColor: string;
  let textColor: string;
  let label: string;

  if (ratio > 1.2) {
    bgColor = 'bg-green-100';
    textColor = 'text-green-800';
    label = 'GREAT VALUE';
  } else if (ratio >= 0.8) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-800';
    label = 'FAIR';
  } else {
    bgColor = 'bg-red-100';
    textColor = 'text-red-800';
    label = 'OVERPAID';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${bgColor} ${textColor}`}
    >
      {display} {label}
    </span>
  );
}
