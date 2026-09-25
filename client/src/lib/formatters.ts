/**
 * Standard Indian Rupee and financial formatters with 2 decimal precision without whole-number rounding.
 */

export const formatRupee = (val: number | string | null | undefined): string => {
  const num = Number(val) || 0;
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNeg ? `-₹${formatted}` : `₹${formatted}`;
};

export const formatAmount = (val: number | string | null | undefined): string => {
  const num = Number(val) || 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
