import StepFunctions from 'aws-sdk/clients/stepfunctions';
import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PRESS_ARTICLES,
  NOTIFICATION_STATE_MACHINE_NAME,
  NOTIFICATION_STATE_MACHINE_ROLE,
  NOTIFICATION_STATE_MACHINE_RESOURCE,
} = process.env;

export const doSendDelayedNotifications = async (
  title,
  message,
  appId,
  articleId,
  delay,
) => {
  const stepfunctions = new StepFunctions();
  const stateMachineParams = {
    name: NOTIFICATION_STATE_MACHINE_NAME,
    roleArn: NOTIFICATION_STATE_MACHINE_ROLE,
    type: 'STANDARD',
    definition: JSON.stringify({
      Comment: 'Delayed broadcasting of notification',
      StartAt: 'Delay',
      States: {
        Delay: {
          Type: 'Wait',
          SecondsPath: '$.delay',
          Next: 'Broadcast',
        },
        Broadcast: {
          Type: 'Task',
          Resource: NOTIFICATION_STATE_MACHINE_RESOURCE,
          Parameters: {
            'title.$': '$.title',
            'message.$': '$.message',
            'appId.$': '$.appId',
            'articleId.$': '$.articleId',
          },
          End: true,
        },
      },
    }, null, 2), /** < Formatting because it can be read on the amazon web interface */
  };

  const { stateMachineArn } = await stepfunctions.createStateMachine(stateMachineParams).promise();

  const execParams = {
    stateMachineArn,
    input: JSON.stringify({
      title,
      message,
      appId,
      articleId,
      delay,
    }),
  };

  const { executionArn } = await stepfunctions.startExecution(execParams).promise();

  const client = await MongoClient.connect();
  await client
    .db(DB_NAME)
    .collection(COLL_PRESS_ARTICLES)
    .updateOne(
      {
        _id: articleId,
        appIds: appId,
      }, {
        $set: {
          pendingNotificationAwsArnId: executionArn,
        },
      },
    );
};
