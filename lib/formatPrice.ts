export function formatEuro(value: number | string) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "€ —";
  return `€ ${amount.toFixed(2)}`;
}
