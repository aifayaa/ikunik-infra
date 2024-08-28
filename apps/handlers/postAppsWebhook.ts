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
  UNKNOWN_PRICE_ID_CODE,
  WEBHOOK_ERROR_CODE,
} from '@libs/httpResponses/errorCodes';
import { sendEmailMailgunTemplate } from '@libs/email/sendEmailMailgun.js';
import { getApp } from '@apps/lib/appsUtils';
import { StripeSubscriptionType } from '@apps/lib/appEntity';
import { getFeaturePlanIdFromStripePriceId } from 'appsFeaturePlans/lib/utils';
import { trowExceptionUntestedCode20240808 } from '@apps/lib/utils';

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

function isCustomerSubscriptionCreatedEvent(
  stripeEvent: Stripe.Event
): stripeEvent is Stripe.CustomerSubscriptionCreatedEvent {
  return stripeEvent.type === 'customer.subscription.created';
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
  stripeEvent: Stripe.InvoicePaymentFailedEvent,
  db: any
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
        console.error('Could not send invoice payment failure email');
      }
    }
  } else {
    console.warn(
      'Received event invoice.payment_failed but could not find associated appId',
      stripeEvent
    );
  }
}

async function checkoutSessionCompletedHandler(
  stripeEvent: Stripe.CheckoutSessionCompletedEvent,
  db: any
) {
  const checkoutSession = stripeEvent.data.object;
  // console.log('checkoutSession', checkoutSession);

  const appId = checkoutSession.metadata?.appId;
  if (!appId) {
    throw new CrowdaaError(
      ERROR_TYPE_STRIPE,
      APP_ID_NOT_FOUND_CODE,
      `Cannot found appId in metadata of checkoutSession: '${checkoutSession.id}'`
    );
  }

  const createdAt = new Date(checkoutSession.created * 1000).toISOString();

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
}

function extractSubscriptionData(
  subscription: Stripe.Subscription
): StripeSubscriptionType {
  const canceledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000)
    : null;
  const createdAt = new Date(subscription.created * 1000);
  const currentPeriodStart = new Date(subscription.current_period_start * 1000);
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  const customer = subscription.customer;
  const endedAt = subscription.ended_at
    ? new Date(subscription.ended_at * 1000)
    : null;
  const items = subscription.items.data.map((item: Stripe.SubscriptionItem) => {
    return {
      id: item.id,
      price: {
        id: item.price.id,
        currency: item.price.currency,
        unitAmount: item.price.unit_amount,
      },
    };
  });
  const latestInvoice = subscription.latest_invoice;
  const livemode = subscription.livemode;
  const nextPendingInvoiceItemInvoice =
    subscription.next_pending_invoice_item_invoice
      ? new Date(subscription.next_pending_invoice_item_invoice * 1000)
      : null;
  const status = subscription.status;
  const transferData = subscription.transfer_data;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;
  const trialStart = subscription.trial_start
    ? new Date(subscription.trial_start * 1000)
    : null;

  const subscriptionRecord = {
    id: subscription.id,
    createdAt,
    currentPeriodStart,
    currentPeriodEnd,
    items,
    livemode,
    status,
  } as StripeSubscriptionType;

  if (canceledAt) {
    subscriptionRecord.canceledAt = canceledAt;
  }
  if (customer) {
    if (typeof customer === 'string') {
      subscriptionRecord.customer = customer;
    } else {
      subscriptionRecord.customer = customer.id;
    }
  }

  if (endedAt) {
    subscriptionRecord.endedAt = endedAt;
  }
  if (latestInvoice) {
    if (typeof latestInvoice === 'string') {
      subscriptionRecord.latestInvoice = latestInvoice;
    } else {
      subscriptionRecord.latestInvoice = latestInvoice.id;
    }
  }
  if (nextPendingInvoiceItemInvoice) {
    subscriptionRecord.nextPendingInvoiceItemInvoice =
      nextPendingInvoiceItemInvoice;
  }
  if (transferData) {
    const destination = transferData.destination;
    subscriptionRecord.transferData = {} as {
      destination: string;
      amountPercent: number;
    };
    if (typeof destination === 'string') {
      subscriptionRecord.transferData.destination = destination;
    } else {
      subscriptionRecord.transferData.destination = destination.id;
    }
    subscriptionRecord.transferData.amountPercent = transferData.amount_percent;
  }
  if (trialEnd) {
    subscriptionRecord.trialEnd = trialEnd;
  }
  if (trialStart) {
    subscriptionRecord.trialStart = trialStart;
  }

  return subscriptionRecord;
}

async function customerSubscriptionHelperHandler(
  stripeEvent:
    | Stripe.CustomerSubscriptionCreatedEvent
    | Stripe.CustomerSubscriptionUpdatedEvent
    | Stripe.CustomerSubscriptionDeletedEvent,
  db: any,
  moreFields?: Record<string, string>
) {
  const subscription = stripeEvent.data.object;

  const appId = subscription.metadata?.appId;
  if (!appId) {
    throw new CrowdaaError(
      ERROR_TYPE_STRIPE,
      APP_ID_NOT_FOUND_CODE,
      `Cannot found appId in metadata of checkoutSession: '${subscription.id}'`
    );
  }

  const extractedSubscriptionData = extractSubscriptionData(subscription);

  const app = await getApp(appId);

  if (isCustomerSubscriptionCreatedEvent(stripeEvent)) {
    const effectiveSubscription: StripeSubscriptionType = moreFields
      ? {
          ...extractedSubscriptionData,
          ...moreFields,
        }
      : {
          ...extractedSubscriptionData,
        };

    const $set = {
      'stripe.subscription': effectiveSubscription,
    } as {
      'stripe.subscription': StripeSubscriptionType;
      'featurePlan._id'?: string;
      'featurePlan.startedAt'?: Date;
    };

    const featurePlanId = getFeaturePlanIdFromStripePriceId(
      extractedSubscriptionData.items[0].price.id
    );

    if (featurePlanId) {
      $set['featurePlan._id'] = featurePlanId;
      $set['featurePlan.startedAt'] = effectiveSubscription.createdAt;
    } else {
      console.warn(
        `Cannot find featurePlanId for stripePriceId '${extractedSubscriptionData.items[0].price.id}'`
      );
    }

    return await db.collection(COLL_APPS).updateOne(
      { _id: appId },
      {
        $set,
      }
    );
  }

  const dbSubscription = app.stripe?.subscription;

  if (!(dbSubscription && dbSubscription.id === subscription.id)) {
    console.warn(
      `Cannot find or mismatch between stripe.subscription and dbSubscription for app '${appId}'`
    );
  }

  if (isCustomerSubscriptionUpdatedEvent(stripeEvent)) {
    let effectiveSubscription: StripeSubscriptionType;
    if (dbSubscription && dbSubscription.id === subscription.id) {
      effectiveSubscription = moreFields
        ? {
            ...dbSubscription,
            ...extractedSubscriptionData,
            ...moreFields,
          }
        : {
            ...dbSubscription,
            ...extractedSubscriptionData,
          };
    } else {
      effectiveSubscription = moreFields
        ? {
            ...extractedSubscriptionData,
            ...moreFields,
          }
        : {
            ...extractedSubscriptionData,
          };
    }

    const $set = {
      'stripe.subscription': effectiveSubscription,
    } as {
      'stripe.subscription': StripeSubscriptionType;
      'featurePlan._id'?: string;
      'featurePlan.startedAt'?: Date;
    };

    const candidatureFeaturePlanId = getFeaturePlanIdFromStripePriceId(
      extractedSubscriptionData.items[0].price.id
    );

    let featurePlanId = 'freeFeaturePlanId';
    if (!candidatureFeaturePlanId) {
      await db.collection(COLL_APPS).updateOne(
        { _id: appId },
        {
          $set,
        }
      );

      throw new CrowdaaError(
        ERROR_TYPE_STRIPE,
        UNKNOWN_PRICE_ID_CODE,
        `Cannot find featurePlanId for stripePriceId '${extractedSubscriptionData.items[0].price.id}'`
      );
    } else {
      featurePlanId = candidatureFeaturePlanId;
    }

    $set['featurePlan._id'] = featurePlanId;
    $set['featurePlan.startedAt'] = effectiveSubscription.createdAt;

    await db.collection(COLL_APPS).updateOne(
      { _id: appId },
      {
        $set,
      }
    );
  }

  if (isCustomerSubscriptionUpdatedEvent(stripeEvent)) {
    let effectiveSubscription: StripeSubscriptionType;
    if (dbSubscription && dbSubscription.id === subscription.id) {
      effectiveSubscription = moreFields
        ? {
            ...dbSubscription,
            ...extractedSubscriptionData,
            ...moreFields,
          }
        : {
            ...dbSubscription,
            ...extractedSubscriptionData,
          };
    } else {
      effectiveSubscription = moreFields
        ? {
            ...extractedSubscriptionData,
            ...moreFields,
          }
        : {
            ...extractedSubscriptionData,
          };
    }

    const $set = {
      'stripe.subscription': effectiveSubscription,
    } as {
      'stripe.subscription': StripeSubscriptionType;
      'featurePlan._id'?: string;
      'featurePlan.startedAt'?: Date;
    };

    let featurePlanId = 'freeFeaturePlanId';

    const canceledAt = effectiveSubscription.canceledAt;

    if (!canceledAt) {
      console.warn(
        `The fields canceledAt is not set for stripe.subscription for app '${appId}'`
      );
    }

    $set['featurePlan._id'] = featurePlanId;
    $set['featurePlan.startedAt'] = canceledAt ? canceledAt : new Date();

    await db.collection(COLL_APPS).updateOne(
      { _id: appId },
      {
        $set,
      }
    );
  }
}

async function customerSubscriptionCreatedHandler(
  stripeEvent: Stripe.CustomerSubscriptionCreatedEvent,
  db: any
) {
  customerSubscriptionHelperHandler(stripeEvent, db);
}

async function customerSubscriptionUpdatedHandler(
  stripeEvent: Stripe.CustomerSubscriptionUpdatedEvent,
  db: any
) {
  const updatedAt = new Date().toISOString();
  customerSubscriptionHelperHandler(stripeEvent, db, {
    updatedAt,
  });
}

async function customerSubscriptionDeletedHandler(
  stripeEvent: Stripe.CustomerSubscriptionDeletedEvent,
  db: any
) {
  customerSubscriptionHelperHandler(stripeEvent, db);
}

export default async (event: APIGatewayProxyEvent) => {
  try {
    // TODO: remove when ready
    if (process.env.STAGE === 'prod') {
      trowExceptionUntestedCode20240808({ httpCode: 400 });
    }

    const payload = checkBodyIsPresent(event.body);

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
      throw new CrowdaaError(
        ERROR_TYPE_STRIPE,
        WEBHOOK_ERROR_CODE,
        `Webhook Error`
      );
    }

    console.log('stripeEvent.type', stripeEvent.type);

    if (!client) client = await MongoClient.connect();
    if (!db) db = client.db();

    if (isCheckoutSessionCompletedEvent(stripeEvent)) {
      checkoutSessionCompletedHandler(stripeEvent, db);
    }

    if (isInvoicePaymentFailedEvent(stripeEvent)) {
      await paymentFailedHandler(stripeEvent, db);
    }

    if (isCustomerSubscriptionCreatedEvent(stripeEvent)) {
      await customerSubscriptionCreatedHandler(stripeEvent, db);
    }

    if (isCustomerSubscriptionUpdatedEvent(stripeEvent)) {
      await customerSubscriptionUpdatedHandler(stripeEvent, db);
    }

    if (isCustomerSubscriptionDeletedEvent(stripeEvent)) {
      await customerSubscriptionDeletedHandler(stripeEvent, db);
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
    if ((exception as CrowdaaError).httpCode) {
      (exception as CrowdaaError).httpCode = 400;
    }
    return handleException(exception);
  } finally {
    client?.close();
  }
};
