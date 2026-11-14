/** Merchant category codes the dataset uses, keyed for the query form (docs/SPEC.md appendix B). */
export const merchantTypes = {
  public_transport: { mcc: '4111', label: 'Public transport' },
  taxi: { mcc: '4121', label: 'Taxi' },
  fuel_station: { mcc: '5541', label: 'Fuel station' },
  fuel_pump: { mcc: '5542', label: 'Self-service fuel' },
  parking: { mcc: '7523', label: 'Parking' },
  supermarket: { mcc: '5411', label: 'Supermarket' },
  butcher: { mcc: '5422', label: 'Meat and frozen food' },
  dairy: { mcc: '5451', label: 'Dairy shop' },
  convenience: { mcc: '5499', label: 'Convenience and speciality food' },
  restaurant: { mcc: '5812', label: 'Restaurant' },
  bar: { mcc: '5813', label: 'Bar' },
  fast_food: { mcc: '5814', label: 'Fast food' },
  cinema: { mcc: '7832', label: 'Cinema' },
  tickets: { mcc: '7922', label: 'Theatre and event tickets' },
  attraction: { mcc: '7991', label: 'Attractions and exhibitions' },
  amusement_park: { mcc: '7996', label: 'Amusement park' },
  recreation: { mcc: '7999', label: 'Recreation services' },
  pharmacy: { mcc: '5912', label: 'Pharmacy' },
  doctor: { mcc: '8011', label: 'Doctor' },
  dentist: { mcc: '8021', label: 'Dentist' },
  medical_other: { mcc: '8099', label: 'Other medical services' },
  home_supply: { mcc: '5200', label: 'Home supply store' },
  hardware: { mcc: '5251', label: 'Hardware store' },
  furniture: { mcc: '5712', label: 'Furniture' },
  electronics: { mcc: '5732', label: 'Electronics' },
  software: { mcc: '5734', label: 'Computer software' },
  clothing_family: { mcc: '5651', label: 'Family clothing' },
  clothing: { mcc: '5691', label: 'Clothing' },
  sports: { mcc: '5941', label: 'Sporting goods' },
  books: { mcc: '5942', label: 'Books' },
  hobby_toys: { mcc: '5945', label: 'Hobby, toys and games' },
  retail_other: { mcc: '5999', label: 'Other retail' },
  airline: { mcc: '4511', label: 'Airline' },
  travel_agency: { mcc: '4722', label: 'Travel agency' },
  hotel: { mcc: '7011', label: 'Hotel' },
  car_rental: { mcc: '7512', label: 'Car rental' },
} as const;

export type MerchantType = keyof typeof merchantTypes;

const byMcc = new Map<string, MerchantType>(
  Object.entries(merchantTypes).map(([key, value]) => [value.mcc, key as MerchantType]),
);

export function merchantTypeForMcc(mcc: string | null): MerchantType | null {
  return mcc ? byMcc.get(mcc) ?? null : null;
}

/** Label for a transaction's merchant type; bills without a merchant code fall back to their category. */
export function merchantLabel(mcc: string | null, category: string) {
  const key = merchantTypeForMcc(mcc);
  return key ? merchantTypes[key].label : category;
}
