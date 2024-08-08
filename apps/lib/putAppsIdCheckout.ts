import Stripe from 'stripe';
import mongoCollections from '@libs/mongoCollections.json';
import { AppType } from './appEntity';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_STRIPE,
  STRIPE_VALID_SUBSCRIPTION_ALREADY_EXIST_CODE,
  USER_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import {
  getMeterEventName,
  getPriceLookupKey,
  getStripeClient,
} from '@libs/stripe';
import { getStripeSubscriptionMetadata } from './appsUtils';
import { UserType } from '@users/lib/userEntity';
import { isString } from 'lodash';
import { getBaserowAffiliate } from '@libs/baserow/getBaserowAffiliate';

const { COLL_APPS, COLL_USERS } = mongoCollections;

type PostAppsIdCheckoutParams = {
  stripeCustomerId: string;
  userId: string;
  app: AppType;
  db: any; // TODO type
};

const dashboardURL = Boolean(process.env.IS_OFFLINE)
  ? 'http://localhost:5173'
  : `https://${process.env.DASHBOARD_V2_DOMAIN}`;

export const putAppsIdCheckout = async ({
  stripeCustomerId,
  userId,
  app,
  db,
}: PostAppsIdCheckoutParams): Promise<string | null> => {
  const stripe = getStripeClient();

  // do not recreate a checkout session if not necessary
  if (app.stripe?.checkoutSessionId) {
    const existingCheckoutSession = await stripe.checkout.sessions.retrieve(
      app.stripe.checkoutSessionId,
      {
        expand: ['subscription'],
      }
    );

    if (existingCheckoutSession?.status === 'complete') {
      // check if one active subscription?
      const subscription =
        existingCheckoutSession.subscription as Stripe.Subscription;
      // can only resubscribe if currently there is no valid subscription
      if (subscription?.status !== 'canceled') {
        throw new CrowdaaError(
          ERROR_TYPE_STRIPE,
          STRIPE_VALID_SUBSCRIPTION_ALREADY_EXIST_CODE,
          `A valid Subscription is already associated to the app ${app._id}`
        );
      }
    } else if (existingCheckoutSession?.status === 'open') {
      // a session is currently in progress
      return existingCheckoutSession.url;
    }
    // existingCheckoutSession.status === 'expired' or no existingCheckoutSession
    // means we can create a new session
  }

  const user: UserType = await db
    .collection(COLL_USERS)
    .findOne({ _id: userId });

  if (!user) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      USER_NOT_FOUND_CODE,
      'Cannot find user',
      {
        details: {
          userId,
        },
      }
    );
  }

  let subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: {
      ...getStripeSubscriptionMetadata('initial'),
      appId: app._id,
    },
  };

  // handle affiliate
  if (
    isString(user.profile.affiliateCode) &&
    user.profile.affiliateCode.length > 0
  ) {
    const baserowAffiliate = await getBaserowAffiliate(
      user.profile.affiliateCode
    );

    if (baserowAffiliate && isString(baserowAffiliate.field_4637)) {
      let fee: number = parseInt(String(baserowAffiliate.field_4602));
      // defaults to 20% if not specified in baserow
      fee = Number.isInteger(fee) ? fee : 20;
      if (fee > 0) {
        subscriptionData.transfer_data = {
          destination: baserowAffiliate.field_4637 as string,
          amount_percent: fee,
        };
      }
    } else {
      // TODO use appropriate logger
      console.warn('Could not find the baserow affiliate or its corresponding stripe account ID', {
        affiliateCode: user.profile.affiliateCode,
        stripeAccountId: baserowAffiliate?.field_4637
      });
      // TODO should we throw an error instead of just warn?
    }
  }

  let meter: Stripe.Billing.Meter | undefined;
  if (app.stripe?.meterId) {
    meter = await stripe.billing.meters.retrieve(app.stripe.meterId);
    // TODO use appropriate logger
    console.log('Found existing meter', {
      appId: app._id,
      meterId: meter.id,
    });
  }

  if (!meter) {
    // stripe will throw an error if attempting to create a meter with an already used event_name
    meter = await stripe.billing.meters.create({
      display_name: `Meter for app ${app.name}`,
      event_name: getMeterEventName(app._id),
      event_time_window: 'day',
      default_aggregation: {
        formula: 'sum',
      },
    });
    // TODO use appropriate logger
    console.log('Created new meter', {
      appId: app._id,
      meterId: meter.id,
    });
  }

  let price: Stripe.Price | undefined;
  if (app.stripe?.priceId) {
    price = await stripe.prices.retrieve(app.stripe.priceId);
    // TODO use appropriate logger
    console.log('Found existing price', {
      appId: app._id,
      priceId: app.stripe.priceId,
    });
  }

  if (!price) {
    price = await stripe.prices.create({
      billing_scheme: 'tiered',
      recurring: {
        usage_type: 'metered',
        interval: 'month',
        meter: meter.id,
        interval_count: 1,
      },
      // TODO handle tax
      tax_behavior: 'inclusive',
      // TODO: see if we should handle USD
      currency: 'eur',
      tiers: [
        {
          flat_amount_decimal: '24900',
          up_to: 2000,
          // unit_amount_decimal: '0'
        },
        {
          flat_amount_decimal: '28000',
          up_to: 5000,
        },
        {
          flat_amount_decimal: '29900',
          up_to: 10000,
        },
        {
          flat_amount_decimal: '49800',
          up_to: 20000,
        },
        {
          flat_amount_decimal: '56000',
          up_to: 30000,
        },
        {
          flat_amount_decimal: '69700',
          up_to: 40000,
        },
        {
          flat_amount_decimal: '80900',
          up_to: 50000,
        },
        {
          flat_amount_decimal: '137000',
          up_to: 100000,
        },
        {
          flat_amount_decimal: '204900',
          up_to: 150000,
        },
        {
          flat_amount_decimal: '273900',
          up_to: 200000,
        },
        {
          flat_amount_decimal: '338300',
          up_to: 250000,
        },
        {
          flat_amount_decimal: '402800',
          up_to: 300000,
        },
        {
          flat_amount_decimal: '467200',
          up_to: 350000,
        },
        {
          flat_amount_decimal: '531700',
          up_to: 400000,
        },
        {
          flat_amount_decimal: '596100',
          up_to: 450000,
        },
        {
          flat_amount_decimal: '660600',
          up_to: 500000,
        },
        {
          flat_amount_decimal: '725000',
          up_to: 550000,
        },
        {
          flat_amount_decimal: '789500',
          up_to: 600000,
        },
        {
          flat_amount_decimal: '853900',
          up_to: 650000,
        },
        {
          flat_amount_decimal: '918400',
          up_to: 700000,
        },
        {
          flat_amount_decimal: '982800',
          up_to: 750000,
        },
        {
          flat_amount_decimal: '1047300',
          up_to: 800000,
        },
        {
          flat_amount_decimal: '1111700',
          up_to: 850000,
        },
        {
          flat_amount_decimal: '1176200',
          up_to: 900000,
        },
        {
          flat_amount_decimal: '1240600',
          up_to: 950000,
        },
        {
          flat_amount_decimal: '1305100',
          up_to: 1000000,
        },
        {
          flat_amount_decimal: '1369500',
          up_to: 'inf',
        },
      ],
      lookup_key: getPriceLookupKey(app._id),
      // product: 'prod_QMf8FuTvRDiCSe',
      tiers_mode: 'volume',
      product_data: {
        name: `Application ${app.name}`,
        // TODO use the right tax code / see if we should Stripe Tax
        tax_code: 'txcd_10000000',
        metadata: {
          appId: app._id,
        },
        unit_label: 'users',
      },
      metadata: {
        appId: app._id,
      },
    });
    // TODO use appropriate logger
    console.log('Created new price', {
      appId: app._id,
      priceId: price.id,
    });
  }

  // TODO ajouter une description
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [
      {
        price: price.id,
      },
    ],
    mode: 'subscription',
    // TODO use the correct dashboard page url, should be specified in env var
    success_url: `${dashboardURL}/payment?checkout_session_payment=success`,
    // TODO use the correct dashboard page url, should be specified in env var
    cancel_url: `${dashboardURL}/payment?checkout_session_payment=canceled`,
    // TODO should we also be able to use USD?
    currency: 'EUR',
    // TODO handle tax, see if we should use the property below
    // automatic_tax: { enabled: true },
    // NOTE: You cannot collect consent to your terms of service unless a
    // URL is set in the Stripe Dashboard
    consent_collection: {
      payment_method_reuse_agreement: {
        position: 'auto',
      },
      terms_of_service: 'required',
    },
    payment_method_collection: 'always',
    metadata: {
      appId: app._id,
    },
    subscription_data: subscriptionData,
  });

  await db.collection(COLL_APPS).updateOne(
    { _id: app._id },
    {
      $set: {
        'stripe.checkoutSessionId': session.id,
        'stripe.priceId': price.id,
        'stripe.meterId': meter.id,
      },
    }
  );

  return session.url;
};
