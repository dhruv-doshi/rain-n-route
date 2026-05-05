import type { Paise, RouteOption, TransportMode } from '@/types';

export interface CostInputs {
  fuelPricePerLitre: Paise;
  fuelEfficiencyKmPerLitre: number;
  parkingFee: Paise;
  tolls: Paise;
  fareOverride?: Paise; // for transit/cab when user knows the actual fare
}

export interface CostBreakdown {
  fuel: Paise;
  parking: Paise;
  tolls: Paise;
  fare: Paise;
  total: Paise;
}

export const DEFAULT_INPUTS: CostInputs = {
  fuelPricePerLitre: 10500, // ₹105/L
  fuelEfficiencyKmPerLitre: 15,
  parkingFee: 0,
  tolls: 0,
};

const FUEL_MODES: TransportMode[] = ['car', 'two_wheeler', 'cab', 'auto'];
const FARE_MODES: TransportMode[] = ['transit', 'cab', 'auto'];

/** Pure: compute a cost breakdown for a route given user inputs. */
export function computeCost(route: RouteOption, inputs: CostInputs): CostBreakdown {
  const km = route.totalDistance / 1_000;
  const primaryMode = route.modes[0] ?? 'mixed';

  let fuel: Paise = 0;
  if (FUEL_MODES.includes(primaryMode) && inputs.fuelEfficiencyKmPerLitre > 0) {
    const litres = km / inputs.fuelEfficiencyKmPerLitre;
    fuel = Math.round(litres * inputs.fuelPricePerLitre);
  }

  let fare: Paise = 0;
  if (FARE_MODES.includes(primaryMode)) {
    fare = inputs.fareOverride ?? route.estimatedCost;
  }

  const parking = inputs.parkingFee;
  const tolls = inputs.tolls;
  const total: Paise = fuel + parking + tolls + fare;

  return { fuel, parking, tolls, fare, total };
}
