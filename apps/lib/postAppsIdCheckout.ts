import Stripe from 'stripe';
import { isEmpty } from 'lodash';
import mongoCollections from '@libs/mongoCollections.json';
import { AppType } from './appEntity';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
  ERROR_TYPE_STRIPE,
  STRIPE_VALID_SUBSCRIPTION_ALREADY_EXIST_CODE,
} from '@libs/httpResponses/errorCodes';
import {
  // getMeterEventName,
  // getPriceLookupKey,
  getStripeClient,
} from '@libs/stripe';
import {
  getApplicationOrganizationId,
  // getStripeSubscriptionMetadata,
} from './appsUtils';
import { UserType } from '@users/lib/userEntity';
import { isString } from 'lodash';
import { getBaserowAffiliate } from '@libs/baserow/getBaserowAffiliate';
import { getUser } from '@users/lib/usersUtils';

const { COLL_APPS, COLL_USERS } = mongoCollections;

type PostAppsIdCheckoutParams = {
  stripeCustomerId: string;
  userId: string;
  app: AppType;
  db: any; // TODO type
  checkoutSessionSuccessUrl: string;
  checkoutSessionCancelUrl: string;
};

type MetadataType = {
  appId: string;
  organizationId: string;
  region: string;
  stage: string;
  stripeCustomerId: string;
  affiliateCode?: string;
  transfer_data_destination?: string;
  transfer_data_amount_percent?: number;
};

// const TEST_PRICE_ID_FREE = 'price_1PqGBkKD2Srbl7IoT2G7sIrD';
const TEST_PRICE_ID_PRO = 'price_1PqAowKD2Srbl7IoasO1tMm1';
const TEST_TAXE_RATE_ID_FR = 'txr_1PqUDiKD2Srbl7IoAoc5dKUM';
const TEST_TAXE_RATE_ID_US = 'txr_1PqU9SKD2Srbl7IoeMoB7mt5';

// The app document SHOULD NOT store:
//  - stripe priceId
//  - stripe meterId

// The app document SHOULD store:
//  - stripe checkoutSessionId

export const postAppsIdCheckout = async ({
  stripeCustomerId,
  userId,
  app,
  db,
  checkoutSessionSuccessUrl,
  checkoutSessionCancelUrl,
}: PostAppsIdCheckoutParams): Promise<string | null> => {
  const stripe = getStripeClient();
  // let appUpdate: Record<string, string> = {};
  let sessionUrl: string | null = null;

  try {
    // // do not recreate a checkout session if not necessary
    // if (app.stripe?.checkoutSessionId) {
    //   const existingCheckoutSession = await stripe.checkout.sessions.retrieve(
    //     app.stripe.checkoutSessionId,
    //     {
    //       expand: ['subscription'],
    //     }
    //   );

    //   if (existingCheckoutSession?.status === 'complete') {
    //     // check if one active subscription?
    //     const subscription =
    //       existingCheckoutSession.subscription as Stripe.Subscription;
    //     // can only resubscribe if currently there is no valid subscription
    //     if (subscription?.status !== 'canceled') {
    //       throw new CrowdaaError(
    //         ERROR_TYPE_STRIPE,
    //         STRIPE_VALID_SUBSCRIPTION_ALREADY_EXIST_CODE,
    //         `A valid Subscription is already associated to the app ${app._id}`
    //       );
    //     }
    //   } else if (existingCheckoutSession?.status === 'open') {
    //     // a session is currently in progress
    //     return existingCheckoutSession.url;
    //   } else {
    //     // existingCheckoutSession.status === 'expired' or no existingCheckoutSession
    //     // means we can create a new session
    //     console.log(
    //       'App current registered checkout session has expired. Creating a new one.'
    //     );
    //   }
    // }

    const user = await getUser(userId);

    if (
      isString(user.profile.affiliateCode) &&
      !isEmpty(user.profile.affiliateCode)
    ) {
      const baserowAffiliate = await getBaserowAffiliate(
        user.profile.affiliateCode
      );

      console.log('baserowAffiliate', baserowAffiliate);
    }

    // // handle affiliate
    // if (
    //   isString(user.profile.affiliateCode) &&
    //   !isEmpty(user.profile.affiliateCode)
    // ) {
    //   const baserowAffiliate = await getBaserowAffiliate(
    //     user.profile.affiliateCode
    //   );

    //   if (baserowAffiliate && isString(baserowAffiliate.field_4637)) {
    //     let fee: number = parseInt(String(baserowAffiliate.field_4602));
    //     // defaults to 20% if not specified in baserow
    //     fee = Number.isInteger(fee) ? fee : 20;
    //     if (fee > 0) {
    //       (subscriptionData.metadata as Stripe.MetadataParam).affiliateCode =
    //         user.profile.affiliateCode;
    //       subscriptionData.transfer_data = {
    //         destination: baserowAffiliate.field_4637 as string,
    //         amount_percent: fee,
    //       };
    //     }
    //   } else {
    //     console.warn(
    //       'Could not find the baserow affiliate or its corresponding stripe account ID',
    //       {
    //         appId: app._id,
    //         userId,
    //         affiliateCode: user.profile.affiliateCode,
    //         stripeAccountId: baserowAffiliate?.field_4637,
    //       }
    //     );
    //   }
    // }

    // let meter: Stripe.Billing.Meter | undefined;
    // if (app.stripe?.meterId) {
    //   meter = await stripe.billing.meters.retrieve(app.stripe.meterId);

    //   console.log('Found existing meter', {
    //     appId: app._id,
    //     meterId: meter.id,
    //   });
    // }

    // if (!meter) {
    //   // stripe will throw an error if attempting to create a meter with an already used event_name
    //   meter = await stripe.billing.meters.create({
    //     display_name: `Meter for app ${app.name}`,
    //     event_name: getMeterEventName(app._id),
    //     event_time_window: 'day',
    //     default_aggregation: {
    //       formula: 'sum',
    //     },
    //   });

    //   console.log('Created new meter', {
    //     appId: app._id,
    //     meterId: meter.id,
    //   });
    // }
    // appUpdate['stripe.meterId'] = meter.id;

    const appOrgId = getApplicationOrganizationId(app);

    // TODO: update tax id for 'prod' environment
    // for now the tax to apply: France/Reunion: 8.5%, Other countries: 0%
    const taxRateIds =
      process.env.STAGE === 'prod'
        ? ['txr_1LBJvdKD2Srbl7Io2CosB1fz']
        : [TEST_TAXE_RATE_ID_FR, TEST_TAXE_RATE_ID_US];
    // [TEST_TAXE_RATE_ID_US];
    // [TEST_TAXE_RATE_ID_FR];

    const metadata: MetadataType = {
      appId: app._id,
      organizationId: appOrgId,
      region: process.env.CROWDAA_REGION as string,
      stage: process.env.STAGE as string,
      stripeCustomerId,
    };

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
      {
        metadata,
      };

    if (
      isString(user.profile.affiliateCode) &&
      !isEmpty(user.profile.affiliateCode)
    ) {
      metadata.affiliateCode = user.profile.affiliateCode;
      subscriptionData.metadata = metadata;

      const baserowAffiliate = await getBaserowAffiliate(
        user.profile.affiliateCode
      );

      if (baserowAffiliate && isString(baserowAffiliate.field_4637)) {
        const baserowFee = parseInt(String(baserowAffiliate.field_4602));
        // defaults to 20% if not specified in baserow
        const fee = Number.isInteger(baserowFee) ? baserowFee : 20;
        if (0 < fee) {
          // metadata.transfer_data = {
          //   destination: baserowAffiliate.field_4637 as string,
          //   amount_percent: fee,
          // };
          // metadata.transfer_data_destination = baserowAffiliate.field_4637;
          // metadata.transfer_data_amount_percent = fee;
          // (subscriptionData.metadata as Stripe.MetadataParam).affiliateCode =
          // user.profile.affiliateCode;
          (subscriptionData.metadata as Stripe.MetadataParam) = metadata;
          subscriptionData.transfer_data = {
            destination: baserowAffiliate.field_4637 as string,
            amount_percent: fee,
          };
        }
      }
    }

    // let subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
    //   {
    //     metadata: {
    //       // ...getStripeSubscriptionMetadata('initial'),
    //       appId: app._id,
    //     },
    //   };

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          // price: price.id,
          price: TEST_PRICE_ID_PRO,
          // price: PRICE_ID_FREE,
          quantity: 1,
          dynamic_tax_rates: taxRateIds,
        },
      ],
      mode: 'subscription',
      success_url: checkoutSessionSuccessUrl,
      cancel_url: checkoutSessionCancelUrl,

      currency: 'EUR',
      /* 
        For now, shipping address is used to decide which tax should be applied.
        Limit user choices to France an USA.

        TODO remove shipping address collection when creating
        customer (during organization creation) will also specify adresses
      */
      shipping_address_collection: {
        allowed_countries: ['FR', 'US'],
      },
      // TODO remove billing address collection when creating customer
      // (during organization creation) will also specify adresses
      billing_address_collection: 'auto',
      // TODO remove when creating customer
      // (during organization creation) will also specify adresses
      customer_update: {
        address: 'auto',
        shipping: 'auto',
      },
      // NOTE: You cannot collect consent to your terms of service unless a
      // URL is set in the Stripe Dashboard
      consent_collection: {
        payment_method_reuse_agreement: {
          position: 'auto',
        },
        terms_of_service: 'required',
      },
      payment_method_collection: 'always',
      metadata: metadata,
      subscription_data: subscriptionData,
    });

    // appUpdate['stripe.checkoutSessionId'] = session.id;
    sessionUrl = session.url;
    // await db.collection(COLL_APPS).updateOne(
    //   { _id: app._id },
    //   {
    //     $set: appUpdate,
    //   }
    // );
  } finally {
  }

  return sessionUrl;
};
