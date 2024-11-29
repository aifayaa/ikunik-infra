import { APIGatewayProxyEvent } from 'aws-lambda';

import MongoClient from '@libs/mongoClient.js';
import mongoCollections from '@libs/mongoCollections.json';
import {
  CHECKOUT_SESSION_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_CHECKOUT_SESSION_SUCCESS_URL_CODE,
  MISSING_QUERY_PARAMETERS_CODE,
  MISSING_SUBSCRIPTION_ID_CODE,
  REQUEST_ORIGIN_NOT_ALLOWED_CODE,
  TOO_OLD_CHECKOUT_SESSION_CODE,
} from '@libs/httpResponses/errorCodes';
import { computeErrorContent } from '@libs/httpResponses/response';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import { getStripeClient } from '@libs/stripe';
import { doCustomerSubscriptionUpdatedHandler } from 'appsStripe/lib/postAppsWebhook';
import { sendEmailMailgunTemplate } from '@libs/email/sendEmailMailgun';

const { COLL_APPS } = mongoCollections;

let client: any; // TODO type
let db: any; // TODO type

export default async (event: APIGatewayProxyEvent) => {
  if (!client) client = await MongoClient.connect();
  if (!db) db = client.db();

  try {
    const headers = event.headers;

    const { referer } = headers;
    if (referer !== 'https://checkout.stripe.com/') {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        REQUEST_ORIGIN_NOT_ALLOWED_CODE,
        'The origin of this request is not allowed'
      );
    }

    const params = event.queryStringParameters;
    if (!params) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_QUERY_PARAMETERS_CODE,
        'Query parameters are missing from the request'
      );
    }

    const { session_id: sessionId } = params;
    // console.log('sessionId', sessionId);
    if (!sessionId) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_QUERY_PARAMETERS_CODE,
        `The query parameter 'sessionId' is missing: '${sessionId}'`
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        CHECKOUT_SESSION_NOT_FOUND_CODE,
        `The checkout session '${sessionId}' is not found`
      );
    }

    const createdAt = new Date(session.created * 1000);

    const now = new Date();
    const oneMinuteInMilliseconds = 60 * 1000;
    const timeBetweenNowAndSessionCreation =
      now.getTime() - createdAt.getTime();
    const isTooOld = oneMinuteInMilliseconds < timeBetweenNowAndSessionCreation;

    if (isTooOld) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        TOO_OLD_CHECKOUT_SESSION_CODE,
        `The checkout session is to old (${timeBetweenNowAndSessionCreation})`
      );
    }

    const checkoutSessionSuccessUrl =
      session.metadata?.checkoutSessionSuccessUrl;

    if (!checkoutSessionSuccessUrl) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_CHECKOUT_SESSION_SUCCESS_URL_CODE,
        `The checkout session success URL is missing`
      );
    }

    const subscriptionId = session.subscription;
    if (typeof subscriptionId !== 'string') {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_SUBSCRIPTION_ID_CODE,
        `Missing the subscription field`
      );
    }

    if (!client) client = await MongoClient.connect();
    if (!db) db = client.db();

    const updatedAt = new Date().toISOString();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const appCollection = db.collection(COLL_APPS);

    await doCustomerSubscriptionUpdatedHandler(subscription, appCollection, {
      updatedAt,
    });

    return {
      statusCode: 301,
      headers: {
        Location: checkoutSessionSuccessUrl,
      },
    };
  } catch (exception) {
    console.error('Error during checkout :', exception);
    console.error('DEBUGGING1', event);
    if (exception instanceof Error) {
      console.error('DEBUGGING2', exception.stack);
    }
    const { body } = computeErrorContent(exception);
    if (process.env.STAGE === 'prod') {
      try {
        await sendEmailMailgunTemplate(
          'No reply <support@crowdaa.com>',
          'prod@crowdaa.com',
          '[Stripe Payment Error] Exception occured in checkout success redirection',
          'internal_raw_mail',
          {
            body: `Details\n\n${JSON.stringify(body, null, 2)}`,
          }
        );
      } catch (err) {
        console.error('Could not send invoice payment failure email :', err);
      }
    }

    return {
      statusCode: 301,
      headers: {
        Location: 'https://app.crowdaa.com/',
      },
    };
  } finally {
    await client.close();
  }
};
