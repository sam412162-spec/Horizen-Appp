import type { Money } from '@/data';

/** { amount: 65000, currency: 'ZAR' } -> "R 650.00" */
export function formatMoney({ amount, currency }: Money) {
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}
