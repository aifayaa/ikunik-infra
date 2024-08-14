import { APIGatewayProxyEvent } from 'aws-lambda';
import response, { handleException } from '@libs/httpResponses/response';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

const allPlans = {
  freePlanId: {
    _id: 'freePlanId',
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
  midPlanId: {
    _id: 'midPlanId',
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
  proPlanId: {
    _id: 'proPlanId',
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

export default async (event: APIGatewayProxyEvent) => {
  const { appId } = event.requestContext.authorizer as { appId: string };

  try {
    return response({
      code: 200,
      body: formatResponseBody({
        data: allPlans['freePlanId'],
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
