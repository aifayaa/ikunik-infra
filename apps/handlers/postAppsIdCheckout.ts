/* eslint-disable import/no-relative-packages */
// import stripe from ('stripe')(
//   'sk_test_51LBJZKKD2Srbl7Iomp6ag5TPCImTUfKOJGxzb7MPFfgBhgaN36c0C9FHzAvUTj4kuWXRx2B5dhQamqFxKZNJAepW00vwksLCFx'
// );
import { APIGatewayProxyEvent } from 'aws-lambda';

import Stripe from 'stripe';

import response, { handleException } from '../../libs/httpResponses/response';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
  ERROR_TYPE_SETUP,
  ERROR_TYPE_STRIPE,
  MISSING_ENVIRONMENT_VARIABLE_CODE,
} from '../../libs/httpResponses/errorCodes';

import { getApp, getApplicationOrganizationId } from '../lib/appsUtils';
import { getOrganization } from '../../organizations/lib/organizationsUtils';
import { getStripeClient } from '../../libs/stripe';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const YOUR_DOMAIN = 'http://localhost:4242';

export default async (
  event: APIGatewayProxyEvent
  // context: Context,
  // callback: APIGatewayProxyCallback
) => {
  const { principalId: userId } = (event.requestContext || {}).authorizer || {};
  const appId = event.pathParameters?.id!;
  // let invitationId = event.pathParameters.id;
  // const { method, path } = request;
  // const logger = generateLogger({ msgPrefix: `[${method} ${path}] ` });

  // console.log('event', event);
  // console.dir(event);
  // console.dir(context);
  // console.dir(callback);

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const app = await getApp(appId);

    const appOrgId = getApplicationOrganizationId(app);

    const org = await getOrganization(appOrgId);

    const { stripeCustomerId } = org;

    const stripe = getStripeClient();

    // const customerId = 'cus_QBJUFNFm3ya1AW';
    const priceId = 'price_1PJxzGKD2Srbl7IorqAOemUE';

    // const subscription = await stripe.subscriptions.create({
    //   customer: customerId,
    //   items: [
    //     {
    //       price: priceId,
    //     },
    //   ],
    //   collection_method: 'charge_automatically',
    //   // current_period_start: ,
    //   trial_period_days: 30,
    //   // billing_cycle_anchor: ,
    //   // COnfiguration of Stripe Connect
    //   // transfer_data: ,
    // });

    // console.log('subscription', subscription);

    const session = await stripe.checkout.sessions.create({
      billing_address_collection: 'auto',
      customer: stripeCustomerId,
      // ERROR: You can not pass ... in `setup` mode
      line_items: [
        {
          // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
          price: priceId,
          quantity: 1,
        },
      ],
      // mode: 'setup', // Save payment details to charge your customers later.
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/success.html`,
      cancel_url: `${YOUR_DOMAIN}/cancel.html`,
      currency: 'EUR',
      // automatic_tax: { enabled: true },
      // ERROR: You cannot collect consent to your terms of service unless a
      // URL is set in the Stripe Dashboard
      consent_collection: {
        payment_method_reuse_agreement: {
          position: 'auto',
        },
        terms_of_service: 'required',
      },
      // ERROR: You can only set `payment_method_collection` in `subscription` mode.
      payment_method_collection: 'always',
      // ERROR: You can not pass ... in `setup` mode
      subscription_data: {
        // trial_period_days: 30,
        metadata: {
          initial: 'true',
          appId,
        },
        // ERROR : The `proration_behavior` parameter can only be passed if a `billing_cycle_anchor` exists.
        // proration_behavior: 'none',
      },
    });

    // console.info(`Success`);

    // console.log('session.url', session.url);

    // res.redirect(303, session.url);
    // return response.status(303).send(session.url);

    if (!session.url) {
      throw new CrowdaaError(
        ERROR_TYPE_STRIPE,
        CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
        `Fail to create Stripe checkout session. session.url: ${session.url}`
      );
    }

    return response({ code: 200, body: { url: session.url } });
  } catch (exception) {
    return handleException(exception);
  }
};
