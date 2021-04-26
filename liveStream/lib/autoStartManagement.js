import StepFunctions from 'aws-sdk/clients/stepfunctions';
import MongoClient from '../../libs/mongoClient';
import startStopLiveStream from './startStopLiveStream';

const {
  DB_NAME,
  COLL_LIVE_STREAM,
  NOTIFICATION_STATE_MACHINE_NAME,
  NOTIFICATION_STATE_MACHINE_ROLE,
  NOTIFICATION_STATE_MACHINE_RESOURCE,
  STATE_MACHINE_REGION,
  STAGE,
} = process.env;

const AUTO_START_BEFORE = 1000 * 60 * 15;

const installStepFunction = async (
  appId,
  liveStreamId,
  start,
  field,
  delay,
) => {
  const stepfunctions = new StepFunctions({
    region: STATE_MACHINE_REGION,
  });
  const stateMachineParams = {
    name: NOTIFICATION_STATE_MACHINE_NAME,
    roleArn: NOTIFICATION_STATE_MACHINE_ROLE,
    type: 'STANDARD',
    definition: JSON.stringify({
      Comment: 'Auto-start of a live-stream',
      StartAt: 'Delay',
      States: {
        Delay: {
          Type: 'Wait',
          SecondsPath: '$.delay',
          Next: 'AutoStart',
        },
        AutoStart: {
          Type: 'Task',
          Resource: NOTIFICATION_STATE_MACHINE_RESOURCE,
          Parameters: {
            'appId.$': '$.appId',
            'liveStreamId.$': '$.liveStreamId',
            'start.$': '$.start',
          },
          End: true,
        },
      },
    }, null, 2), /** < Formatting because it can be read on the amazon web interface */
  };

  const { stateMachineArn } = await stepfunctions.createStateMachine(stateMachineParams).promise();

  const execParams = {
    stateMachineArn,
    name: `${STAGE}-${liveStreamId}-${Date.now()}`,
    input: JSON.stringify({
      appId,
      liveStreamId,
      start,
      delay,
    }),
  };

  const { executionArn } = await stepfunctions.startExecution(execParams).promise();

  const client = await MongoClient.connect();
  await client
    .db(DB_NAME)
    .collection(COLL_LIVE_STREAM)
    .updateOne(
      {
        _id: liveStreamId,
        appId,
      }, {
        $set: {
          [field]: executionArn,
        },
      },
    );
  client.close();

  return (executionArn);
};

export const unsetDelayedAutoStart = async (
  liveStream,
) => {
  const client = await MongoClient.connect();
  try {
    if (liveStream.autoStartAwsArnId) {
      const stepfunctions = new StepFunctions();
      try {
        await stepfunctions.stopExecution({
          executionArn: liveStream.autoStartAwsArnId,
        }).promise();
      } catch (e) {
        /**
         * We don't need to investigate further, other cases are
         * handled in the handler itself
         */
      }

      delete liveStream.autoStartAwsArnId;
      await client
        .db(DB_NAME)
        .collection(COLL_LIVE_STREAM)
        .updateOne(
          {
            _id: liveStream._id,
          }, {
            $unset: {
              autoStartAwsArnId: '',
            },
          },
        );
    }
  } finally {
    client.close();
  }
};

export const unsetDelayedAutoEnd = async (
  liveStream,
) => {
  const client = await MongoClient.connect();
  try {
    if (liveStream.autoEndAwsArnId) {
      const stepfunctions = new StepFunctions();
      try {
        await stepfunctions.stopExecution({
          executionArn: liveStream.autoEndAwsArnId,
        }).promise();
      } catch (e) {
        /**
         * We don't need to investigate further, other cases are
         * handled in the handler itself
         */
      }

      delete liveStream.autoEndAwsArnId;
      await client
        .db(DB_NAME)
        .collection(COLL_LIVE_STREAM)
        .updateOne(
          {
            _id: liveStream._id,
          }, {
            $unset: {
              autoEndAwsArnId: '',
            },
          },
        );
    }
  } finally {
    client.close();
  }
};

export const setDelayedAutoStartEnd = async (
  liveStream,
) => {
  const { appId } = liveStream;
  const startDelay = ((
    liveStream.startDateTime.getTime() -
    AUTO_START_BEFORE -
    Date.now()
  ) / 1000) | 0;
  const endDelay = ((
    liveStream.endDateTime.getTime() -
    Date.now()
  ) / 1000) | 0;

  if (liveStream.autoStartAwsArnId) {
    await unsetDelayedAutoStart(liveStream);
  }

  if (liveStream.autoEndAwsArnId) {
    await unsetDelayedAutoEnd(liveStream);
  }

  if (endDelay < 0) {
    return ({
      scheduled: false,
      error: false,
      skipped: true,
    });
  }

  let error = false;
  try {
    if (startDelay > 0) {
      liveStream.autoStartAwsArnId = await installStepFunction(appId, liveStream._id, true, 'autoStartAwsArnId', startDelay);
    } else if (liveStream.state !== 'starting' && liveStream.state !== 'started') {
      await startStopLiveStream(appId, liveStream._id, true);
    }
    liveStream.autoEndAwsArnId = await installStepFunction(appId, liveStream._id, false, 'autoEndAwsArnId', endDelay);
  } catch (e) {
    error = e;
  }

  return ({
    scheduled: !!liveStream.autoStartAwsArnId,
    error,
  });
};
