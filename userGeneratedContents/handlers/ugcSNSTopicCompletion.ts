/* eslint-disable import/no-relative-packages */
import { verifyUGCVideoModerationResults } from '../lib/aiModerationTools';
import { SNSEvent } from 'aws-lambda';

/*
Example :
{
  JobId: '5c0151f19de82471a4d396a27139bacc2c48629cead013c293d4a67ef2d49b85',
  Status: 'SUCCEEDED',
  API: 'StartContentModeration',
  JobTag: '0b4a140a-eb86-4fd0-8cdd-7555c32da17a', // UGC ID
  Timestamp: 1739257542347,
  Video: {
    S3ObjectName: 'VideoStorage/95161677-f864-4c3b-893f-105874d42775.mp4',
    S3Bucket: 'slsupload-dev'
  }
}
*/

type UGCSNSTopicCompletionMessageFormatType = {
  JobId: string;
  Status: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  API: string;
  JobTag: string;
  Timestamp: number;
  Video: {
    S3ObjectName: string;
    S3Bucket: string;
  };
};

export default async (event: SNSEvent) => {
  try {
    const messages = event.Records.map((record) => {
      const message: UGCSNSTopicCompletionMessageFormatType = JSON.parse(
        record.Sns.Message
      );
      return message;
    });

    await Promise.allSettled(
      messages.map(async ({ JobTag: ugcId, JobId, Status }) => {
        if (Status === 'SUCCEEDED' || Status === 'FAILED') {
          const ok = Status === 'SUCCEEDED';
          await verifyUGCVideoModerationResults(ugcId, JobId, ok);
        }
      })
    );
  } catch (exception) {
    console.log('ugcSNSTopicCompletion: Caught error:', exception);
  }
};
