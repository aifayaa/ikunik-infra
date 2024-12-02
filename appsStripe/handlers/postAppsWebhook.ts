import { APIGatewayProxyEvent } from 'aws-lambda';
import Stripe from 'stripe';

import response, { handleException } from '@libs/httpResponses/response';
import { getStripeClient } from '@libs/stripe';
import { checkBodyIsPresent } from '@libs/httpResponses/checks';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import MongoClient from '@libs/mongoClient.js';
import mongoCollections from '@libs/mongoCollections.json';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_ID_NOT_FOUND_CODE,
  ERROR_TYPE_STRIPE,
  SIGNATURE_CHECK_ERROR_CODE,
} from '@libs/httpResponses/errorCodes';
import { sendEmailMailgunTemplate } from '@libs/email/sendEmailMailgun.js';
import { getApp } from '@apps/lib/appsUtils';
import {
  doCustomerSubscriptionDeletedHandler,
  doCustomerSubscriptionUpdatedHandler,
} from 'appsStripe/lib/postAppsWebhook';
import { CrowdaaStripeIgnoredError } from 'appsStripe/lib/CrowdaaStripeIgnoredError';
import { AppType } from '@apps/lib/appEntity';

const { COLL_APPS } = mongoCollections;
const STRIPE_WEBHOOK_SECRET = Boolean(process.env.IS_OFFLINE)
  ? // webhook secret created by the stripe cli when locally listening for events
    'whsec_f87467f40045df67affa6b33de01b7b1d8da6d41bc480facacbd3d8fcae7ec71'
  : String(process.env.STRIPE_WEBHOOK_SECRET_KEY);

let client: any; // TODO type
let db: any; // TODO type

function isInvoicePaymentFailedEvent(
  stripeEvent: Stripe.Event
): stripeEvent is Stripe.InvoicePaymentFailedEvent {
  return stripeEvent.type === 'invoice.payment_failed';
}

function isCheckoutSessionCompletedEvent(
  stripeEvent: Stripe.Event
): stripeEvent is Stripe.CheckoutSessionCompletedEvent {
  return stripeEvent.type === 'checkout.session.completed';
}

function isCustomerSubscriptionUpdatedEvent(
  stripeEvent: Stripe.Event
): stripeEvent is Stripe.CustomerSubscriptionUpdatedEvent {
  return stripeEvent.type === 'customer.subscription.updated';
}

function isCustomerSubscriptionDeletedEvent(
  stripeEvent: Stripe.Event
): stripeEvent is Stripe.CustomerSubscriptionDeletedEvent {
  return stripeEvent.type === 'customer.subscription.deleted';
}

async function paymentFailedHandler(
  stripeEvent: Stripe.InvoicePaymentFailedEvent
) {
  const invoice = stripeEvent.data.object;

  if (invoice.subscription_details?.metadata?.appId) {
    // make sure the app still exist and this event is intended for the right crowdaa region (fr or us)
    // const app: AppType = await db
    //   .collection(COLL_APPS)
    //   .findOne({ _id: invoice.subscription_details?.metadata?.appId });

    // Check if the associated app still exist
    await getApp(invoice.subscription_details?.metadata?.appId);

    // console.log('Received event invoice.payment_failed', stripeEvent);
    const stripeDashboardUrl =
      process.env.STAGE === 'prod'
        ? 'https://dashboard.stripe.com'
        : 'https://dashboard.stripe.com/test';

    console.error(
      `Invoice payment failed. Check ${stripeDashboardUrl}/invoices/${invoice.id}`,
      {
        stripeEvent,
      }
    );

    if (process.env.STAGE === 'prod') {
      try {
        await sendEmailMailgunTemplate(
          'No reply <support@crowdaa.com>',
          'connect@crowdaa.com',
          '[Stripe Payment Error] An invoice payment failed',
          'internal_raw_mail',
          {
            body: `Invoice (id ${invoice.id}) payment failed (attempt ${invoice.attempt_count}). You can check ${stripeDashboardUrl}/invoices/${invoice.id}`,
          }
        );
      } catch (err) {
        console.error(
          'Could not send invoice payment failure email, err =',
          err
        );
      }
    }
  } else {
    console.warn(
      'Received event invoice.payment_failed but could not find associated appId',
      stripeEvent,
      JSON.stringify(invoice, null, 2)
    );
  }
}

async function checkoutSessionCompletedHandler(
  stripeEvent: Stripe.CheckoutSessionCompletedEvent,
  stripe: Stripe,
  db: any
) {
  const checkoutSession = stripeEvent.data.object;

  const appId = checkoutSession.metadata?.appId;
  if (!appId) {
    throw new CrowdaaStripeIgnoredError(
      ERROR_TYPE_STRIPE,
      APP_ID_NOT_FOUND_CODE,
      `Cannot found appId in metadata of checkoutSession: '${checkoutSession.id}'`
    );
  }

  const app = (await db
    .collection(COLL_APPS)
    .findOne({ _id: appId })) as AppType;
  if (!app) {
    throw new CrowdaaStripeIgnoredError(
      ERROR_TYPE_STRIPE,
      APP_ID_NOT_FOUND_CODE,
      `Cannot find app with id ${appId}`
    );
  }

  const createdAt = new Date(checkoutSession.created * 1000);

  await db.collection(COLL_APPS).updateOne(
    { _id: appId },
    {
      $push: {
        'stripe.checkoutSession': {
          id: checkoutSession.id,
          status: checkoutSession.status,
          mode: checkoutSession.mode,
          createdAt,
        },
      },
    }
  );

  if (checkoutSession.subscription) {
    let subscription: Stripe.Subscription;
    if (typeof checkoutSession.subscription === 'string') {
      subscription = await stripe.subscriptions.retrieve(
        checkoutSession.subscription
      );
    } else {
      subscription = checkoutSession.subscription;
    }

    const updatedAt = new Date();

    const appCollection = db.collection(COLL_APPS);

    await doCustomerSubscriptionUpdatedHandler(subscription, appCollection, {
      updatedAt,
    });
  }
}

async function customerSubscriptionUpdatedHandler(
  stripeEvent: Stripe.CustomerSubscriptionUpdatedEvent,
  db: any
) {
  const subscription = stripeEvent.data.object;
  const appCollection = db.collection(COLL_APPS);
  const updatedAt = new Date();

  await doCustomerSubscriptionUpdatedHandler(subscription, appCollection, {
    updatedAt,
  });
}

async function customerSubscriptionDeletedHandler(
  stripeEvent: Stripe.CustomerSubscriptionDeletedEvent,
  db: any
) {
  const subscription = stripeEvent.data.object;
  const appCollection = db.collection(COLL_APPS);

  await doCustomerSubscriptionDeletedHandler(subscription, appCollection);
}

export default async (event: APIGatewayProxyEvent) => {
  try {
    const payload = checkBodyIsPresent(event.body);
    // console.log('payload', payload);

    const stripe = getStripeClient();

    let stripeEvent: Stripe.Event | undefined;

    try {
      const sig = event.headers['Stripe-Signature'] as string;
      stripeEvent = await stripe.webhooks.constructEventAsync(
        payload,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (exception) {
      console.log('postAppsWebhook Stripe parsing exception :', exception);

      console.log('Event', JSON.stringify(event, null, 2));
      throw new CrowdaaError(
        ERROR_TYPE_STRIPE,
        SIGNATURE_CHECK_ERROR_CODE,
        `Fail to verify Stripe signature`
      );
    }

    console.log('stripeEvent.type', stripeEvent.type);

    if (!client) client = await MongoClient.connect();
    if (!db) db = client.db();

    if (isCustomerSubscriptionUpdatedEvent(stripeEvent)) {
      await customerSubscriptionUpdatedHandler(stripeEvent, db);
    }

    if (isCustomerSubscriptionDeletedEvent(stripeEvent)) {
      await customerSubscriptionDeletedHandler(stripeEvent, db);
    }

    if (isCheckoutSessionCompletedEvent(stripeEvent)) {
      await checkoutSessionCompletedHandler(stripeEvent, stripe, db);
    }

    if (isInvoicePaymentFailedEvent(stripeEvent)) {
      await paymentFailedHandler(stripeEvent);
    }

    return response({
      code: 200,
      // body does not seem necessary for the webhook response
      body: formatResponseBody({
        data: {
          message: 'Ok',
        },
      }),
    });
  } catch (exception) {
    console.log('postAppsWebhook general exception :', exception);

    if (exception instanceof CrowdaaStripeIgnoredError) {
      // Returning 200 makes the webhook work for stripe but ignores any error, so it will not be retried
      return response({
        code: 200,
        // body does not seem necessary for the webhook response
        body: formatResponseBody({
          data: {
            name: 'CrowdaaStripeIgnoredError',
            message: exception.message,
          },
        }),
      });
    }

    const ret = handleException(exception);
    ret.statusCode = 500;
    return ret;
  } finally {
    client?.close();
  }
};
