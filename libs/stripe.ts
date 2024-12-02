import Stripe from 'stripe';

import { CrowdaaError } from './httpResponses/CrowdaaError';
import {
  ERROR_TYPE_SETUP,
  MISSING_ENVIRONMENT_VARIABLE_CODE,
} from './httpResponses/errorCodes';

const { STRIPE_SECRET_KEY } = process.env;

let stripeClient: Stripe;

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;

  if (STRIPE_SECRET_KEY === undefined) {
    throw new CrowdaaError(
      ERROR_TYPE_SETUP,
      MISSING_ENVIRONMENT_VARIABLE_CODE,
      `Missing environment variable STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}`,
      { httpCode: 500 }
    );
  }

  stripeClient = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
    typescript: true,
  });

  return stripeClient;
}

export const getMeterEventName = (appId: string): string => {
  return `app-meter_${appId}`;
};

export const getPriceLookupKey = (appId: string): string => {
  return `app-price-lookup-key_${appId}`;
};
