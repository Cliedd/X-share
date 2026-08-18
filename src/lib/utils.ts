export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const currency = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formate un montant en dollars selon la convention francophone : 9,99 $ */
export function formatPrice(value: number) {
  return `${currency.format(value)} $`;
}
