import Stripe from 'stripe';

import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';

import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_ID_NOT_FOUND_CODE,
  ERROR_TYPE_STRIPE,
  UNKNOWN_PRICE_ID_CODE,
} from '@libs/httpResponses/errorCodes';
import { getApp } from '@apps/lib/appsUtils';
import { AppType, StripeSubscriptionType } from '@apps/lib/appEntity';
import { DEFAULT_APP_SETTINGS } from '@apps/lib/createApp.js';
import { getFeaturePlanIdFromStripePriceId } from 'appsFeaturePlans/lib/utils';
import {
  unpublishArticlesInDb,
  unpublishArticlesNotifications,
} from 'pressArticles/lib/unpublishArticles';
import { FeaturePlanIdType } from 'appsFeaturePlans/lib/planTypes';
import { CrowdaaStripeIgnoredError } from './CrowdaaStripeIgnoredError';

const { COLL_PRESS_CATEGORIES, COLL_APPS } = mongoCollections;

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

async function customerSubscriptionHelperHandlerInit(
  subscription: Stripe.Subscription,
  moreFields?: Record<string, string | Date>
) {
  const appId = subscription.metadata?.appId;
  if (!appId) {
    throw new CrowdaaStripeIgnoredError(
      ERROR_TYPE_STRIPE,
      APP_ID_NOT_FOUND_CODE,
      `Cannot found appId in metadata of checkoutSession: '${subscription.id}'`
    );
  }
  const client = await MongoClient.connect();
  const db = client.db();

  try {
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

    const extractedSubscriptionData = extractSubscriptionData(subscription);

    const dbSubscription = app.stripe?.subscription;

    if (!(dbSubscription && dbSubscription.id === subscription.id)) {
      console.warn(
        `Cannot find or mismatch between stripe.subscription and dbSubscription for app '${appId}'`
      );
    }

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

    return { effectiveSubscription, appId };
  } finally {
    await client.close();
  }
}

export async function doCustomerSubscriptionUpdatedHandler(
  subscription: Stripe.Subscription,
  appCollection: any,
  moreFields?: Record<string, string | Date>
) {
  const { effectiveSubscription, appId } =
    await customerSubscriptionHelperHandlerInit(subscription, moreFields);

  const $set = {
    'stripe.subscription': effectiveSubscription,
  } as {
    'stripe.subscription': StripeSubscriptionType;
    featurePlan?: { _id: string; startedAt: Date };
  };

  const candidatureFeaturePlanId = getFeaturePlanIdFromStripePriceId(
    effectiveSubscription.items[0].price.id
  );

  if (!candidatureFeaturePlanId) {
    await appCollection.updateOne(
      { _id: appId },
      {
        $set,
      }
    );

    throw new CrowdaaError(
      ERROR_TYPE_STRIPE,
      UNKNOWN_PRICE_ID_CODE,
      `Cannot find featurePlanId for stripePriceId '${effectiveSubscription.items[0].price.id}'`
    );
  }

  const featurePlanId = candidatureFeaturePlanId
    ? candidatureFeaturePlanId
    : 'freeFeaturePlanId';

  const validSubscriptionStatus = ['trialing', 'active', 'past_due'];

  if (
    featurePlanId !== 'freeFeaturePlanId' &&
    validSubscriptionStatus.includes(effectiveSubscription.status)
  ) {
    $set['featurePlan'] = {
      _id: featurePlanId,
      startedAt: effectiveSubscription.createdAt,
    };
  } else {
    $set['featurePlan'] = {
      _id: 'freeFeaturePlanId',
      startedAt: new Date(),
    };
  }

  await appCollection.updateOne(
    { _id: appId },
    {
      $set,
    }
  );
}

async function updateAppWithSubscriptionData(
  appCollection: any,
  appId: string,
  effectiveSubscription: StripeSubscriptionType,
  session: unknown
) {
  const $set = {
    'stripe.subscription': effectiveSubscription,
  } as {
    'stripe.subscription': StripeSubscriptionType;
    featurePlan?: { _id: string; startedAt: Date };
  };

  let featurePlanId: FeaturePlanIdType = 'freeFeaturePlanId';

  const canceledAt = effectiveSubscription.canceledAt;

  if (!canceledAt) {
    console.warn(
      `The fields canceledAt is not set for stripe.subscription for app '${appId}'`
    );
  }

  $set['featurePlan'] = {
    _id: featurePlanId,
    startedAt: canceledAt ? canceledAt : new Date(),
  };

  await appCollection.updateOne(
    { _id: appId },
    {
      $set,
    },
    { session }
  );
}

async function unpublishCategoriesWithBadges(
  queryCategoriesToUnpublish: Record<string, any>,
  db: any,
  session: unknown
) {
  await db.collection(COLL_PRESS_CATEGORIES).updateMany(
    queryCategoriesToUnpublish,
    {
      $set: {
        hidden: true,
      },
    },
    { session }
  );
}

async function resetThemeCustomisation(
  appCollection: any,
  appId: string,
  session: unknown
) {
  await appCollection.updateOne(
    { appId },
    { $unset: { 'press.env.appThemeColorPrimary': 1 } },
    { session }
  );
}

async function resetTabsCustomisation(
  appCollection: any,
  appId: string,
  session: unknown
) {
  await appCollection.updateOne(
    { appId },
    {
      $set: {
        'press.env.startTab': DEFAULT_APP_SETTINGS.press.env.startTab,
        'press.env.tabOrder': DEFAULT_APP_SETTINGS.press.env.tabOrder,
      },
    },
    { session }
  );
}

async function deleteTranslationsCustomisation(
  appCollection: any,
  appId: string,
  session: unknown
) {
  await appCollection.updateOne(
    { appId },
    {
      $unset: {
        'settings.press.intl': 1,
      },
    },
    { session }
  );
}

export async function doCustomerSubscriptionDeletedHandler(
  subscription: Stripe.Subscription,
  appCollection: any,
  moreFields?: Record<string, string | Date>
) {
  const { effectiveSubscription, appId } =
    await customerSubscriptionHelperHandlerInit(subscription, moreFields);

  // BEGIN update DB
  const client = await MongoClient.connect();
  const db = await client.db();

  // Unpublish items which have at least one badge
  const queryItemWithAtLeastOneBadge = {
    appId,
    $expr: {
      $gte: [
        {
          $size: { $ifNull: ['$badges.list', []] },
        },
        1,
      ],
    },
  };

  // Unpublish articles with an embedded playlist
  const queryArticlesWithEmbeddedPlaylist = {
    appId,
    text: { $regex: /<iframe.*src=.*playlist\.crowdaa\.com\/.*>/i },
  };

  // Unpublish articles with an embedded survey
  const queryArticlesWithEmbeddedSurvey = {
    appId,
    isPoll: true,
  };

  // Documentation, how to use transaction:
  // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
  await client.withSession(
    async (sessionArg: {
      withTransaction: (session: unknown) => Promise<void>;
    }) => {
      await sessionArg.withTransaction(async (session: unknown) => {
        await updateAppWithSubscriptionData(
          appCollection,
          appId,
          effectiveSubscription,
          session
        );

        // Unpublish articles which have at least one badge
        await unpublishArticlesInDb(queryItemWithAtLeastOneBadge, db, session);

        // Unpublish categories which have at least one badge
        await unpublishCategoriesWithBadges(
          queryItemWithAtLeastOneBadge,
          db,
          session
        );

        // Remove theme customisation for the application
        await resetThemeCustomisation(appCollection, appId, session);

        // Restore default tabs and tabs' order
        await resetTabsCustomisation(appCollection, appId, session);

        // Reset translation to default
        await deleteTranslationsCustomisation(appCollection, appId, session);

        // Unpublish articles with an embedded playlist
        await unpublishArticlesInDb(
          queryArticlesWithEmbeddedPlaylist,
          db,
          session
        );

        // Unpublish articles with an embedded survey
        await unpublishArticlesInDb(
          queryArticlesWithEmbeddedSurvey,
          db,
          session
        );
      });
    }
  );
  await unpublishArticlesNotifications(queryItemWithAtLeastOneBadge, db);

  // END update DB
}
