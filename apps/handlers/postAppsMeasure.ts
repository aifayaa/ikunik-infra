/* eslint-disable import/no-relative-packages */
// import stripe from ('stripe')(
//   'sk_test_51LBJZKKD2Srbl7Iomp6ag5TPCImTUfKOJGxzb7MPFfgBhgaN36c0C9FHzAvUTj4kuWXRx2B5dhQamqFxKZNJAepW00vwksLCFx'
// );
import { APIGatewayProxyEvent } from 'aws-lambda';

import Stripe from 'stripe';

import response, {
  formatResponseError,
  handleException,
  isCrowdaaError,
  wrapperHandleException,
} from '../../libs/httpResponses/response';
import { getStripeClient } from '../../libs/stripe';

import { checkBodyIsPresent } from '../../libs/httpResponses/checks';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  CHECKOUT_SESSION_INSTANCIATION_FAILED_CODE,
  ERROR_TYPE_STRIPE,
} from '../../libs/httpResponses/errorCodes';
import {
  getApplicationOrganizationId,
  getStripeSubscriptionMetadata,
  isStripeSubcriptionStatus,
} from '../lib/appsUtils';
import { AppType } from '../lib/appEntity';
import { getNbActiveUsers } from '../../userMetrics/lib/getMAU';
import { getOrganization } from '../../organizations/lib/organizationsUtils';
import { OrganizationType } from '../../organizations/lib/organizationEntity';

const { COLL_APPS } = mongoCollections;

const STRIPE_WEBHOOK_SECRET =
  'whsec_f87467f40045df67affa6b33de01b7b1d8da6d41bc480facacbd3d8fcae7ec71';

export default async (event: APIGatewayProxyEvent) => {
  try {
    // Find every app with a stripe subscription
    const client = await MongoClient.connect();
    const db = client.db();
    const apps: Array<AppType> = await db
      .collection(COLL_APPS)
      .find({ stripeSubscriptionId: { $exists: true } })
      .toArray();
    // .map((app: AppType) => app.stripeSubscriptionId);

    // const payload = checkBodyIsPresent(event.body);

    const stripe = getStripeClient();

    //
    const appToMeasure: Array<{ app: AppType; nbActiveUser: number }> = [];

    const errors = [];

    // For each app...
    for (const app of apps) {
      const stripeSubscriptionId = app.stripeSubscriptionId!;

      // ... get the date of the last stripe invoice
      const invoicesResponse = await stripe.invoices.search({
        query: `subscription:"${stripeSubscriptionId}"`,
      });

      const invoices = invoicesResponse.data;

      if (invoices.length === 0) {
        continue;
      }

      const lastInvoice = invoices[0];
      const { created } = lastInvoice;

      // ... from this date, count the number of active users on the application
      const lastInvoiceDate = new Date(created * 1000);
      console.log(lastInvoiceDate);
      const now = new Date();

      const { count: nbActiveUser }: { count: number } = await getNbActiveUsers(
        db,
        app._id,
        lastInvoiceDate,
        now
      );

      appToMeasure.push({ app, nbActiveUser });

      // ... send the number of active users to Stripe for this subscription
      let appOrgId = '';
      try {
        appOrgId = getApplicationOrganizationId(app);
      } catch (exception) {
        if (isCrowdaaError(exception)) {
          errors.push(formatResponseError(exception));
          continue;
        } else {
          throw exception;
        }
      }

      let org: OrganizationType;
      try {
        org = await getOrganization(appOrgId);
      } catch (exception) {
        if (isCrowdaaError(exception)) {
          errors.push(formatResponseError(exception));
          continue;
        } else {
          throw exception;
        }
      }

      const stripeCustomerId = org.stripeCustomerId;

      console.log('nbActiveUser', nbActiveUser);
      console.log('stripeCustomerId', stripeCustomerId);
      console.log('stripeSubscriptionId', stripeSubscriptionId);

      await stripe.billing.meterEvents.create({
        event_name: 'monthly_active_users',
        payload: {
          value: String(nbActiveUser),
          stripe_customer_id: stripeCustomerId,
        },
        identifier: `${app._id}_${stripeSubscriptionId}`,
      });
    }

    if (errors.length > 0) {
      return response({
        code: 200,
        body: formatResponseBody({ errors }),
      });
    } else {
      return response({
        code: 200,
        body: formatResponseBody({
          data: {
            message: 'Ok',
          },
        }),
      });
    }
  } catch (exception) {
    // console.log('exception', exception);
    return handleException(exception);
  }
};
