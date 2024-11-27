import Stripe from 'stripe';
import { isEmpty } from 'lodash';
import { getStripeClient } from '@libs/stripe';
import { isString } from 'lodash';
import { getBaserowAffiliate } from '@libs/baserow/getBaserowAffiliate';
import { getUser } from '@users/lib/usersUtils';
import { FeaturePlanIdType } from 'appsFeaturePlans/lib/planTypes';
import { getApplicationOrganizationId } from '@apps/lib/appsUtils';
import { AppType } from '@apps/lib/appEntity';
import { getEnvironmentVariable } from '@libs/check';

type PostAppsIdCheckoutParams = {
  stripeCustomerId: string;
  userId: string;
  app: AppType;
  featurePlanId: FeaturePlanIdType;
  checkoutSessionSuccessUrl: string;
  checkoutSessionCancelUrl: string;
};

type MetadataType = {
  appId: string;
  organizationId: string;
  region: string;
  stage: string;
  stripeCustomerId: string;
  checkoutSessionSuccessUrl: string;
  affiliateCode?: string;
  transfer_data_destination?: string;
  transfer_data_amount_percent?: number;
};

const STRIPE_PRICE_ID_PRO = getEnvironmentVariable('STRIPE_PRICE_ID_PRO', {
  dontThrow: true,
});
const STRIPE_TAX_RATE_ID_FR = getEnvironmentVariable('STRIPE_TAX_RATE_ID_FR', {
  dontThrow: true,
});
const STRIPE_TAX_RATE_ID_US = getEnvironmentVariable('STRIPE_TAX_RATE_ID_US', {
  dontThrow: true,
});

export const postAppsIdCheckout = async ({
  stripeCustomerId,
  userId,
  app,
  featurePlanId,
  checkoutSessionSuccessUrl,
  checkoutSessionCancelUrl,
}: PostAppsIdCheckoutParams) => {
  const stripe = getStripeClient();

  const DOMAIN_NAME = getEnvironmentVariable('DOMAIN_NAME');
  const STAGE = getEnvironmentVariable('STAGE');

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

  const appOrgId = getApplicationOrganizationId(app);

  const metadata: MetadataType = {
    appId: app._id,
    organizationId: appOrgId,
    region: process.env.CROWDAA_REGION as string,
    stage: process.env.STAGE as string,
    stripeCustomerId,
    checkoutSessionSuccessUrl,
  };

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
    {
      metadata,
    };

  // TODO: re-enable the affiliate code when ready
  // // handle affiliation
  // if (
  //   isString(user.profile.affiliateCode) &&
  //   !isEmpty(user.profile.affiliateCode)
  // ) {
  //   metadata.affiliateCode = user.profile.affiliateCode;
  //   subscriptionData.metadata = metadata;

  //   const baserowAffiliate = await getBaserowAffiliate(
  //     user.profile.affiliateCode
  //   );

  //   if (baserowAffiliate && isString(baserowAffiliate.field_4637)) {
  //     const baserowFee = parseInt(String(baserowAffiliate.field_4602));
  //     // defaults to 20% if not specified in baserow
  //     const fee = Number.isInteger(baserowFee) ? baserowFee : 20;
  //     if (0 < fee) {
  //       // metadata.transfer_data = {
  //       //   destination: baserowAffiliate.field_4637 as string,
  //       //   amount_percent: fee,
  //       // };
  //       // metadata.transfer_data_destination = baserowAffiliate.field_4637;
  //       // metadata.transfer_data_amount_percent = fee;
  //       // (subscriptionData.metadata as Stripe.MetadataParam).affiliateCode =
  //       // user.profile.affiliateCode;
  //       (subscriptionData.metadata as Stripe.MetadataParam) = metadata;
  //       subscriptionData.transfer_data = {
  //         destination: baserowAffiliate.field_4637 as string,
  //         amount_percent: fee,
  //       };
  //     }
  //   }
  // }

  const itemPrice = STRIPE_PRICE_ID_PRO;
  // for now the tax to apply: France/Reunion: 8.5%, Other countries: 0%
  const taxRateIds = [STRIPE_TAX_RATE_ID_FR, STRIPE_TAX_RATE_ID_US];

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [
      {
        price: itemPrice,
        quantity: 1,
        dynamic_tax_rates: taxRateIds,
      },
    ],
    mode: 'subscription',
    success_url: `https://${DOMAIN_NAME}/v1/apps/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
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

  return { url: session.url, expiresAt: new Date(session.expires_at * 1000) };
};
