import Stripe from 'stripe';

import { CrowdaaError } from './httpResponses/CrowdaaError';
import {
  ERROR_TYPE_SETUP,
  MISSING_ENVIRONMENT_VARIABLE_CODE,
} from './httpResponses/errorCodes';

const { STRIPE_SECRET_KEY } = process.env;

export function getStripeClient() {
  if (STRIPE_SECRET_KEY === undefined) {
    throw new CrowdaaError(
      ERROR_TYPE_SETUP,
      MISSING_ENVIRONMENT_VARIABLE_CODE,
      `Missing environment variable STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}`,
      { httpCode: 500 }
    );
  }

  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10',
    typescript: true,
  });
}
