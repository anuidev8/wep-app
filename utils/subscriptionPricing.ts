import { SubscriptionPlan, UISubscriptionPlan } from '../types';

const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  COP: 0.00025,
  GBP: 1.27,
  BRL: 0.2,
  MXN: 0.059,
  JPY: 0.0067,
  AUD: 0.66,
  CAD: 0.74,
};

export const convertToUSD = (amount: number, fromCurrency: string): number => {
  const rate = USD_RATES[fromCurrency.toUpperCase()];
  if (!rate) {
    return amount;
  }
  return amount * rate;
};

export const formatUSD = (amount: number): string => {
  const rounded = Math.round(amount * 100) / 100;
  return `$${rounded.toFixed(2)}`;
};

export const mapPlansToUI = (plans: SubscriptionPlan[]): UISubscriptionPlan[] =>
  plans.map((plan) => {
    const usdAmount = convertToUSD(plan.price, plan.currency);
    return {
      ...plan,
      displayPriceUSD: formatUSD(usdAmount),
    };
  });
