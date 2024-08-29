import { FeaturePlanIdType } from './planTypes';

const STRIPE_SUBSCRIPTION_PRICE_ID_PRO = 'price_1Psm6LKD2Srbl7IouRke2m7H';

const stripePriceIdToFeaturePlanIdMap: Record<string, FeaturePlanIdType> = {
  [STRIPE_SUBSCRIPTION_PRICE_ID_PRO]: 'proFeaturePlanId',
};

export function getFeaturePlanIdFromStripePriceId(
  stripePriceId: string
): FeaturePlanIdType {
  return stripePriceIdToFeaturePlanIdMap[stripePriceId];
}
