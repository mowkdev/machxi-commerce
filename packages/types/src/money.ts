// Money is a transport-layer value object. Amounts are always in minor
// units (cents/pence/öre) per schema convention §8. Never use floats.

export interface Money {
  amount: number;
  currencyCode: string;
}
