import Lambda from 'aws-sdk/clients/lambda';
import {
  CrowdSearchMassUpdateFiltersType,
  CrowdSearchMassUpdateNotifyPayloadType,
} from './crowdTypes';
const { STAGE } = process.env as { STAGE: string };

const lambda = new Lambda({
  region: process.env.REGION,
});

export default async (
  appId: string,
  filters: CrowdSearchMassUpdateFiltersType,
  payload: CrowdSearchMassUpdateNotifyPayloadType,
  notifyAt?: Date
) => {
  const response = await lambda
    .invoke({
      FunctionName: `blast-${STAGE}-queueNotifications`,
      Payload: JSON.stringify({
        appId,
        notifyAt: notifyAt || new Date(),
        type: 'crowdMassNotify',
        data: {
          payload,
          filters,
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
