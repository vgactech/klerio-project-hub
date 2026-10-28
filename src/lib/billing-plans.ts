// Prix Stripe des forfaits Klerio (TTC, EUR)
export const PRICES = {
  pro_month: "price_1UVcBXH8iCu6cONUj80XVaQK", // 7,99 €
  pro_year: "price_1UVcBbH8iCu6cONUtOKNqUpz", // 79,90 €
  famille_month: "price_1UVcBbH8iCu6cONUSzhMqhfJ", // 12,99 €
  famille_year: "price_1UVcBcH8iCu6cONUZPRULKNS", // 129,90 €
} as const;

export const PRODUCT_TO_PLAN: Record<string, "pro" | "famille"> = {
  prod_VWfW5LtPILCiu8: "pro",
  prod_VWfW9OXLU2Vx5F: "pro",
  prod_VWfW7rONjEM3HM: "famille",
  prod_VWfWABJaF4f66z: "famille",
};
