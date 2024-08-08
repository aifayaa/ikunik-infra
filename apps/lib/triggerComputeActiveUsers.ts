import { Lambda } from 'aws-sdk';
import { AppType } from '@apps/lib/appEntity';
import mongoCollections from '@libs/mongoCollections.json';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import { CALL_COMPUTE_ACTIVE_USERS_FOR_DAY_CODE, ERROR_TYPE_COMPUTE_ACTIVE_USERS_ERROR } from '@libs/httpResponses/errorCodes';

const { COLL_APPS } = mongoCollections;

const lambda = new Lambda({
  // TODO retrieve current lambda port for local use
  endpoint: process.env.IS_OFFLINE ? 'http://localhost:3002' : undefined,
});

type TriggerComputeMonthlyActiveUsersParams = {
  day: Date;
  db: any; // TODO type
}

export const triggerComputeActiveUsers = async ({
  day,
  db
}: TriggerComputeMonthlyActiveUsersParams): Promise<CrowdaaError[]> => {
  // TODO batchSize configurable using env var or request parameter ?
  const batchSize = 100;
  let skip = 0;
  let hasMoreDocuments = true;
  const crowdaaErrors: CrowdaaError[] = [];

  // TODO use appropriate logger
  console.log(`Calling lambda putComputeActiveUsersForDay...`, {
    day
  });
  while (hasMoreDocuments) {
    const documents: Array<AppType> = await db
      .collection(COLL_APPS)
      .find({ 'stripe.subscriptionId': { $exists: true } })
      .project({ _id: 1, stripe: 1 })
      .skip(skip)
      .limit(batchSize)
      .toArray();

    if (documents.length === 0) {
      hasMoreDocuments = false;
    } else {
      // TODO use appropriate logger
      console.log(`Processing ${documents.length} documents...`);
      for (let app of documents) {
        try {
          const payload = { 
            appId: app._id,
            day,
          };
          const params = {
            FunctionName: `apps-${process.env.STAGE}-putComputeActiveUsersForDay`,
            InvocationType: 'Event',
            Payload: JSON.stringify(payload),
          };

          // TODO use appropriate logger
          console.log('Call lambda putComputeActiveUsersForDay', {
            payload,
          });
          const result = await lambda.invoke(params).promise();
          // TODO use appropriate logger
          console.log('Lambda result', {
            appId: app._id,
            result
          });
        } catch (err) {
          crowdaaErrors.push(
            new CrowdaaError(
              ERROR_TYPE_COMPUTE_ACTIVE_USERS_ERROR,
              CALL_COMPUTE_ACTIVE_USERS_FOR_DAY_CODE,
              'Failed call putComputeActiveUsersForDay',
              {
                details: {
                  day,
                  appId: app._id,
                  message: (err as Error).message,
                },
              }
            )
          );
        }
      }

      skip += batchSize;
    }
  }
  // TODO use appropriate logger
  console.log('Call lambda putComputeActiveUsersForDay done', {
    day
  });

  return crowdaaErrors;
}