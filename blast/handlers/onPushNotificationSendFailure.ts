import { promiseExecUntilTrue } from '@libs/utils';
import { SNSEvent } from 'aws-lambda';

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
 */
export default async (event: SNSEvent) => {
  const toProcessRecords = [...event.Records];
  await promiseExecUntilTrue(async () => {
    const record = toProcessRecords.pop();
    if (!record) {
      return true;
    }

    console.log('DEBUG record', JSON.stringify(record, null, 2));

    try {
      const message = JSON.parse(record.Sns.Message);
      console.log('DEBUG message', JSON.stringify(message, null, 2));
    } catch (e) {
      console.log('Error parsing message :', e);
    }

    return false;
  });
};
