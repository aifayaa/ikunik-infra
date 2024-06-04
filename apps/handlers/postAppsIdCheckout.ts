/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';

import response, { handleException } from '../../libs/httpResponses/response';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
  ERROR_TYPE_STRIPE,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_APPLICATION_CODE,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';

import {
  getApp,
  getApplicationOrganizationId,
  getStripeSubscriptionMetadata,
} from '../lib/appsUtils';
import { getOrganization } from '../../organizations/lib/organizationsUtils';
import { getStripeClient } from '../../libs/stripe';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';

const YOUR_DOMAIN = 'http://localhost:4242';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = (event.requestContext || {}).authorizer || {};
  const appId = event.pathParameters?.id;

  try {
    if (!appId) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_APPLICATION_CODE,
        `Path parameter appId is not defined: '${appId}'`
      );
    }

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    const enableSubscriptionSchema = z
      .object({
        success_url: z
          .string({
            required_error: 'success_url is required',
            invalid_type_error: 'success_url must be a string',
          })
          .trim(),
        cancel_url: z
          .string({
            required_error: 'cancel_url is required',
            invalid_type_error: 'cancel_url must be a string',
          })
          .trim(),
      })
      .required();

    const body = JSON.parse(event.body);

    let validatedBody;
    // validation
    try {
      validatedBody = enableSubscriptionSchema.parse(body);
    } catch (exception) {
      return formatValidationErrors(exception);
    }

    await checkPermsForApp(userId, appId, ['admin']);

    const app = await getApp(appId);

    const appOrgId = getApplicationOrganizationId(app);

    const org = await getOrganization(appOrgId);

    const { stripeCustomerId } = org;

    const stripe = getStripeClient();

    const priceId = 'price_1PNTqoKD2Srbl7IolMUv2lHG';

    const { success_url, cancel_url } = validatedBody;

    const session = await stripe.checkout.sessions.create({
      billing_address_collection: 'auto',
      customer: stripeCustomerId,
      // ERROR: You can not pass ... in `setup` mode
      line_items: [
        {
          // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
          price: priceId,
          // quantity: 1,
        },
      ],
      // mode: 'setup', // Save payment details to charge your customers later.
      mode: 'subscription',
      success_url: success_url,
      cancel_url: cancel_url,
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
          ...getStripeSubscriptionMetadata('initial'),
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
