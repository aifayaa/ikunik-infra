import { FeaturePlanIdType } from './planTypes';

const STRIPE_SUBSCRIPTION_PRICE_ID_PRO = 'price_1PqAowKD2Srbl7IoasO1tMm1';

const stripePriceIdToFeaturePlanIdMap: Record<string, FeaturePlanIdType> = {
  [STRIPE_SUBSCRIPTION_PRICE_ID_PRO]: 'proFeaturePlanId',
};

export function getFeaturePlanIdFromStripePriceId(
  stripePriceId: string
): FeaturePlanIdType {
  return stripePriceIdToFeaturePlanIdMap[stripePriceId];
}
