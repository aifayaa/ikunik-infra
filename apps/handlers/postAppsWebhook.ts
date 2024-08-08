import { APIGatewayProxyEvent } from 'aws-lambda';
import Stripe from 'stripe';

import response, {
  handleException,
  wrapperHandleException,
} from '@libs/httpResponses/response';
import { getStripeClient } from '@libs/stripe';
import { checkBodyIsPresent } from '@libs/httpResponses/checks';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import MongoClient from '@libs/mongoClient.js';
import mongoCollections from '@libs/mongoCollections.json';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
  ERROR_TYPE_STRIPE,
} from '@libs/httpResponses/errorCodes';
import {
  getStripeSubscriptionMetadata,
  isStripeSubcriptionStatus,
} from '@apps/lib/appsUtils';
import { sendEmailMailgunTemplate } from '@libs/email/sendEmailMailgun.js';
import { AppType } from '@apps/lib/appEntity';

const { COLL_APPS } = mongoCollections;

const STRIPE_WEBHOOK_SECRET = Boolean(process.env.IS_OFFLINE)
  ? // webhook secret created by the stripe cli when locally listening for events
    'whsec_f87467f40045df67affa6b33de01b7b1d8da6d41bc480facacbd3d8fcae7ec71'
  : String(process.env.STRIPE_WEBHOOK_SECRET_KEY);

let client: any; // TODO type
let db: any; // TODO type

export default async (event: APIGatewayProxyEvent) => {
  try {
    const payload = checkBodyIsPresent(event.body);

    /*
      TODO check request originates from allowed domains and ip https://docs.stripe.com/ips#notifications-de-webhook
      is it possible to filter ip addresses in the API gateway configuration ?
    */

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
      wrapperHandleException(exception, (exception) => {
        return response({
          code: 400,
          body: formatResponseBody({
            errors: [
              {
                type: 'STRIPE_WEBHOOK',
                code: '400',
                message: `Webhook Error: ${exception.message}`,
                details: exception.stack,
              },
            ],
          }),
        });
      });
    }

    if (!stripeEvent) {
      throw new CrowdaaError(
        ERROR_TYPE_STRIPE,
        CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
        `The Stripe event is not defined`
      );
    }
    /* 
      TODO: 
      - should we check stripeEvent.livemode ? https://docs.stripe.com/webhooks#live-and-test-mode
      - save every stripe event that were handled? we might receive the same event multiple times,
      by doing so, we can check every time and ensure that each event is handled only once.
      - stripe does not guaranty the order of events received. see if we should enhance the code
      to handle such situations
      - check if operations (db access, computing, etc) we apply takes too long and might cause
      stripe response time to timeout ?
      - use one separate file to handle one event type
    */
    if (stripeEvent.type === 'customer.subscription.created') {
      // TODO use appropriate logger
      console.log('Received event customer.subscription.created', stripeEvent);
      if (!client) client = await MongoClient.connect();
      if (!db) db = client.db();

      const subscription = stripeEvent.data.object;

      const { metadata } = subscription;

      const { appId, crowdaaStatus } = metadata;

      const stripeSubscriptionId = subscription.id;

      const { matchedCount } = await db.collection(COLL_APPS).updateOne(
        { _id: appId },
        {
          $set: {
            'stripe.subscriptionId': subscription.id,
          },
        }
      );

      if (
        matchedCount === 1 && // make sure the app still exist and this event is intended for the right crowdaa region (fr or us)
        isStripeSubcriptionStatus(crowdaaStatus) &&
        crowdaaStatus === 'initial'
      ) {
        const updatedSubscription = await stripe.subscriptions.update(
          stripeSubscriptionId,
          {
            metadata: {
              ...metadata,
              ...getStripeSubscriptionMetadata('hold'),
            },
            // Suspend the subscription payment
            pause_collection: {
              behavior: 'void',
            },
          }
        );
        // TODO use appropriate logger
        console.log('Paused subscription payment collection', {
          appId,
          updatedSubscription,
          stripeEvent,
        });
      } else {
        // TODO use appropriate logger
        console.warn('Did not pause subscription payment collection', {
          appId,
          matchedCount,
          subscription,
          stripeEvent,
        });
      }
    } else if (stripeEvent.type === 'customer.subscription.updated') {
      // NOTE subscription updated event is also fired when payment collection is "paused/resumed"
      const subscription = stripeEvent.data.object;
      if (subscription.metadata.appId) {
        if (!client) client = await MongoClient.connect();
        if (!db) db = client.db();

        // make sure the app still exist and this event is intended for the right crowdaa region (fr or us)
        const app: AppType = await db
          .collection(COLL_APPS)
          .findOne({ _id: subscription.metadata.appId });

        if (app) {
          // TODO use appropriate logger
          console.log(
            'Received event customer.subscription.updated',
            stripeEvent
          );
          // TODO check subscription payment collection has been resumed or paused
          // and remove/grant access to the associated app? anything should be done?
        } else {
          console.log(
            'Received event customer.subscription.updated but the associated app does not exist',
            stripeEvent
          );
        }
      } else {
        // TODO use appropriate logger
        console.warn(
          'Received event customer.subscription.updated but could not find associated appId',
          stripeEvent
        );
      }
    } else if (stripeEvent.type === 'invoice.payment_failed') {
      const invoice = stripeEvent.data.object;

      if (invoice.subscription_details?.metadata?.appId) {
        if (!client) client = await MongoClient.connect();
        if (!db) db = client.db();

        // make sure the app still exist and this event is intended for the right crowdaa region (fr or us)
        const app: AppType = await db
          .collection(COLL_APPS)
          .findOne({ _id: invoice.subscription_details?.metadata?.appId });

        if (app) {
          // TODO use appropriate logger
          console.log('Received event invoice.payment_failed', stripeEvent);
          let stripeDashboardUrl = 'https://dashboard.stripe.com';

          if (process.env.STAGE === 'prod') {
            try {
              // TODO create an email template for this case?
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
              // TODO use appropriate logger
              console.error('Could not send invoice payment failure email');
            }
          } else {
            stripeDashboardUrl += '/test';
          }

          // TODO use appropriate logger
          console.error(
            `Invoice payment failed. Check ${stripeDashboardUrl}/invoices/${invoice.id}`,
            {
              stripeEvent,
            }
          );
        } else {
          console.log(
            'Received event invoice.payment_failed but the associated app does not exist',
            stripeEvent
          );
        }
      } else {
        // TODO use appropriate logger
        console.warn(
          'Received event invoice.payment_failed but could not find associated appId',
          stripeEvent
        );
      }
    } else {
      // TODO use appropriate logger
      console.warn('Received unhandled event', stripeEvent);
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
    return handleException(exception);
  } finally {
    client?.close();
  }
};
