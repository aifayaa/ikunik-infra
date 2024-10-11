import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '@libs/mongoClient';
import mongoViews from '@libs/mongoViews.json';
import {
  CrowdSearchMassUpdateFiltersType,
  CrowdSearchMassUpdateNotifyPayloadType,
} from './crowdTypes';
import { buildCrowdSearchPipeline } from './crowdUtils';

const { VIEW_USER_METRICS_UUID_AGGREGATED } = mongoViews;

const { STAGE } = process.env as { STAGE: string };

const lambda = new Lambda({
  region: process.env.REGION,
});

export default async (
  appId: string,
  filters: CrowdSearchMassUpdateFiltersType,
  payload: CrowdSearchMassUpdateNotifyPayloadType
) => {
  const pipeline = buildCrowdSearchPipeline(appId, filters);

  const response = await lambda
    .invoke({
      FunctionName: `blast-${STAGE}-queueNotifications`,
      Payload: JSON.stringify({
        appId,
        notifyAt: payload.notifyAt || new Date(),
        type: 'crowdMassNotify',
        data: {
          notification: {
            title: payload.title,
            content: payload.content,
            extraData: payload.extraData,
          },
          crowdPipeline: pipeline,
        },
      }),
    })
    .promise();

  const { queueId } = response.Payload
    ? JSON.parse(response.Payload.toString())
    : { queueId: false };

  return {
    queueId,
  };
};
