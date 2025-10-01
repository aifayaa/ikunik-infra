import MongoClient from '@libs/mongoClient';
import SNS from 'aws-sdk/clients/sns';
import { promiseExecUntilTrue } from '@libs/utils';
import mongoCollections from '@libs/mongoCollections.json';
import { SNSEvent } from 'aws-lambda';

const { COLL_PUSH_NOTIFICATIONS } = mongoCollections;
const { SNS_KEY_ID, SNS_REGION, SNS_SECRET } = process.env as {
  SNS_KEY_ID: string;
  SNS_REGION: string;
  SNS_SECRET: string;
};

const sns = new SNS({
  region: SNS_REGION,
  credentials: {
    accessKeyId: SNS_KEY_ID,
    secretAccessKey: SNS_SECRET,
  },
});

/**
 * Input example :
{
  "Records": [
    {
      "EventSource": "aws:sns",
      "EventVersion": "1.0",
      "EventSubscriptionArn": "arn:aws:sns:us-west-2:630176884077:blast-push-failure-dev-us:aebd9a83-5093-462f-860a-50b3ddb0e4bb",
      "Sns": {
        "Type": "Notification",
        "MessageId": "3c1f1d8b-e9ad-57cf-a143-7ccfb49436bf",
        "TopicArn": "arn:aws:sns:us-west-2:630176884077:blast-push-failure-dev-us",
        "Message": "{\"DeliveryAttempts\":1,\"EndpointArn\":\"arn:aws:sns:us-west-2:630176884077:endpoint/GCM/dev-dev-InAppPureChaise-android/ce14083e-402f-3b72-8520-9608fe54f5fd\",\"EventType\":\"DeliveryFailure\",\"FailureMessage\":\"Notification body is invalid\",\"FailureType\":\"InvalidNotification\",\"MessageId\":\"252ed579-9b8c-5e90-907c-b43dc6b45539\",\"Resource\":\"arn:aws:sns:us-west-2:630176884077:app/GCM/dev-dev-InAppPureChaise-android\",\"Service\":\"SNS\",\"Time\":\"2025-09-17T06:53:45.049Z\"}",
        "Timestamp": "2025-09-17T06:53:45.078Z",
        "SignatureVersion": "1",
        "Signature": "bWd938M4vSNuy7DHq1rXb45mOByqUqk/vGOAjC8JFt+2QgKdjvkYL0tgv4PrLS73gamMsWg6MHb2s7mqQewVFJ+WCQ7RPGcCH4TVG6J848h0UZnZQKPUH6RwGDcjUSiTlRL1ileabt7Wm7t7eaBDAjZMJvn71mOjYzyhqCj+3n2EJeKERUxMN+oSEYg773iw15cVDn1Ey5fWj3d+mmo9FgII0QFAt3MGzmrIq/E6RKlh6JiZ2J48UlLdjVlkcXEownedFoJHlwT9YWL1wEMwo7dRPbwuR2G3BpB8X+YsGztAVZqznLMfp4VhE/xveorhfE4yW+hcno3UVNNKI/8FgA==",
        "SigningCertUrl": "https://sns.us-west-2.amazonaws.com/SimpleNotificationService-6209c161c6221fdf56ec1eb5c821d112.pem",
        "Subject": "DeliveryFailure event for app dev-dev-InAppPureChaise-android (GCM)",
        "UnsubscribeUrl": "https://sns.us-west-2.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-west-2:630176884077:blast-push-failure-dev-us:aebd9a83-5093-462f-860a-50b3ddb0e4bb",
        "MessageAttributes": {}
      }
    }
  ]
}

{
  "EventSource": "aws:sns",
  "EventVersion": "1.0",
  "EventSubscriptionArn": "arn:aws:sns:us-west-2:630176884077:blast-push-failure-dev-us:aebd9a83-5093-462f-860a-50b3ddb0e4bb",
  "Sns": {
    "Type": "Notification",
    "MessageId": "840e4627-943e-558a-b849-277255d709a2",
    "TopicArn": "arn:aws:sns:us-west-2:630176884077:blast-push-failure-dev-us",
    "Message": "{\"DeliveryAttempts\":1,\"EndpointArn\":\"arn:aws:sns:us-west-2:630176884077:endpoint/GCM/dev-dev-InAppPureChaise-android/466beb61-4e32-3538-884c-8539bd184056\",\"EventType\":\"DeliveryFailure\",\"FailureMessage\":\"Platform token associated with the endpoint is not valid\",\"FailureType\":\"InvalidPlatformToken\",\"MessageId\":\"374edf5f-9e35-5eeb-a03a-be0a5fdccbc3\",\"Resource\":\"arn:aws:sns:us-west-2:630176884077:app/GCM/dev-dev-InAppPureChaise-android\",\"Service\":\"SNS\",\"Time\":\"2025-09-30T11:31:53.650Z\"}",
    "Timestamp": "2025-09-30T11:31:53.693Z",
    "SignatureVersion": "1",
    "Signature": "YBN1NJh97uEymMEFGEVo1MiaqWQL0Q5eJkai+OW2kT+0+4CFFGgDW0PQjB2LmYQ5krjBmSSOvsjWYsyZJB//jGz4uZ4/5sPUCfkIecVRPBVoqsbFHpDfHgnKMRksJNS/Kytg/Vn4gLsqIAL3b259Ntq0q6uvFTaP1iKlUU2dpfqljU8e6KH/1YBJ1ukDPqGhlr4QaeaF7Oc0vR36XrVwr2JDCp0rkWIMLmABgM6xBfWgBR0r9ficNNPqJbw8yYrVdH4eK6LIgOEF/ULdX8qRLgxcHKicVTow++88MFe2+++eWaUwvY+FYRxpZ0KGm4QaY121pqIqMNwpM4AnMlUSlw==",
    "SigningCertUrl": "https://sns.us-west-2.amazonaws.com/SimpleNotificationService-6209c161c6221fdf56ec1eb5c821d112.pem",
    "Subject": "DeliveryFailure event for app dev-dev-InAppPureChaise-android (GCM)",
    "UnsubscribeUrl": "https://sns.us-west-2.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-west-2:630176884077:blast-push-failure-dev-us:aebd9a83-5093-462f-860a-50b3ddb0e4bb",
    "MessageAttributes": {}
  }
}
 */

/*
 * For a list of failure types, see :
 * https://docs.aws.amazon.com/sns/latest/dg/sns-fcm-v1-payloads.html#:~:text=Notification%20body%20is%20invalid.,to%20the%20newest%20device%20token.
 */

export default async (event: SNSEvent) => {
  const client = await MongoClient.connect();
  const toProcessRecords = [...event.Records];

  await new Promise((resolve) => {
    // Give enough time to insert message data on the sending part, if the error arrives too fast.
    setTimeout(resolve, 200);
  });

  try {
    const db = client.db();
    await promiseExecUntilTrue(async () => {
      const record = toProcessRecords.pop();
      if (!record) {
        return true;
      }

      try {
        const message = JSON.parse(record.Sns.Message);
        const { EndpointArn, MessageId } = message;

        if (message.FailureType === 'InvalidPlatformToken') {
          await db.collection(COLL_PUSH_NOTIFICATIONS).deleteOne({
            EndpointArn,
          });

          await sns
            .deleteEndpoint({
              EndpointArn,
            })
            .promise();
        } else {
          console.info(
            'Unhandled message FailureType :',
            JSON.stringify(message, null, 2)
          );
        }

        /// @TODO HANDLE MessageId to mark message as not sent
      } catch (e) {
        console.error(
          'Error processing message',
          record.Sns.Message,
          ', error :',
          e
        );
      }

      return false;
    });
  } finally {
    await client.close();
  }
};
