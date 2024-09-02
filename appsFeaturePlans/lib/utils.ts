import { getEnvironmentVariable } from '@libs/check';
import { FeaturePlanIdType } from './planTypes';

const STRIPE_PRICE_ID_PRO = getEnvironmentVariable('STRIPE_PRICE_ID_PRO', {
  dontThrow: true,
});

const stripePriceIdToFeaturePlanIdMap: Record<string, FeaturePlanIdType> = {
  [STRIPE_PRICE_ID_PRO]: 'proFeaturePlanId',
};

export function getFeaturePlanIdFromStripePriceId(
  stripePriceId: string
): FeaturePlanIdType {
  return stripePriceIdToFeaturePlanIdMap[stripePriceId];
}
