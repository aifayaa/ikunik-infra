/* eslint-disable import/no-relative-packages */
// import stripe from ('stripe')(
//   'sk_test_51LBJZKKD2Srbl7Iomp6ag5TPCImTUfKOJGxzb7MPFfgBhgaN36c0C9FHzAvUTj4kuWXRx2B5dhQamqFxKZNJAepW00vwksLCFx'
// );
import {
  APIGatewayProxyCallback,
  APIGatewayProxyEvent,
  Context,
} from 'aws-lambda';

import Stripe from 'stripe';

import { handleException } from '../../libs/httpResponses/response';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
  ERROR_TYPE_SETUP,
  ERROR_TYPE_STRIPE,
  MISSING_ENVIRONMENT_VARIABLE_CODE,
} from '../../libs/httpResponses/errorCodes';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const stripe = (() => {
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
})();

const YOUR_DOMAIN = 'http://localhost:4242';

export default async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: APIGatewayProxyCallback
) => {
  const { principalId: currentUserId } =
    (event.requestContext || {}).authorizer || {};
  // let invitationId = event.pathParameters.id;
  // const { method, path } = request;
  // const logger = generateLogger({ msgPrefix: `[${method} ${path}] ` });

  // console.log('event', event);
  // console.dir(event);
  console.dir(context);
  console.dir(callback);

  try {
    // try {
    console.info(`Begin`);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
          price: 'price_1P0iF0KD2Srbl7Io3kX935WH',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/success.html`,
      cancel_url: `${YOUR_DOMAIN}/cancel.html`,
      automatic_tax: { enabled: true },
    });

    console.info(`Success`);

    console.log('session.url', session.url);

    // res.redirect(303, session.url);
    // return response.status(303).send(session.url);

    if (!session.url) {
      throw new CrowdaaError(
        ERROR_TYPE_STRIPE,
        CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
        `Fail to create Stripe checkout session. session.url: ${session.url}`
      );
    }

    const redirectResponse = {
      statusCode: 303,
      statusDescription: 'See Other',
      headers: {
        Location: session.url,
      },
      body: '',
    };

    callback(null, redirectResponse);
  } catch (exception) {
    return handleException(exception);
  }
};
