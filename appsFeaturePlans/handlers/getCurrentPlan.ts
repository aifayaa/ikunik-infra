import { APIGatewayProxyEvent } from 'aws-lambda';

// import MongoClient from '@libs/mongoClient.js';
// import mongoCollections from '@libs/mongoCollections.json';
import response, { handleException } from '@libs/httpResponses/response';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { getApp } from '@apps/lib/appsUtils';

// const { COLL_APPS } = mongoCollections;

const allPlans = {
  freeFeaturePlanId: {
    _id: 'freeFeaturePlanId',
    tags: ['free'],
    features: {
      mau: {
        max: 1000,
        resetPeriod: 'month',
      },
      appCollaborators: {
        max: 3,
      },
      pushNotifications: {
        max: 1000,
        resetPeriod: 'month',
        resetPeriodWindow: 'fixed',
      },
      theme: true,
    },
  },
  midFeaturePlanId: {
    _id: 'midFeaturePlanId',
    tags: ['mid'],
    features: {
      mau: {
        max: 10000,
        resetPeriod: 'month',
      },
      appCollaborators: {
        max: 10,
      },
      pushNotifications: {
        max: 10000,
        resetPeriod: 'month',
        resetPeriodWindow: 'fixed',
      },
      theme: true,
      community: true,
      playlists: true,
    },
  },
  proFeaturePlanId: {
    _id: 'proFeaturePlanId',
    tags: ['pro'],
    features: {
      mau: true,
      appCollaborators: true,
      organizationCollaborators: true,
      pushNotifications: true,
      theme: true,
      polls: true,
      chat: true,
      community: true,
      playlists: true,
      iap: true,
      analytics: true,
      support: true,
    },
  },
};

// let client: any; // TODO type
// let db: any; // TODO type

export default async (event: APIGatewayProxyEvent) => {
  const { appId } = event.requestContext.authorizer as { appId: string };

  try {
    const app = await getApp(appId);

    console.log('app', app);

    const planId = app.featurePlan ? app.featurePlan._id : 'freeFeaturePlanId';

    return response({
      code: 200,
      body: formatResponseBody({
        data: allPlans[planId],
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
