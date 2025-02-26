import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { UGCArticleType } from './ugcEntities';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

const { REGION, STAGE } = process.env;

const lambda = new LambdaClient({
  apiVersion: '2016-06-27',
  region: REGION,
});

export function prepareNotif(text: string, length = 116, ellipsis = false) {
  const preparedText = text
    /* Replace new lines with whitespaces */
    .replace(/[\n\r]+/g, ' ')

    /* Remove successive whitespaces */
    .replace(/\s{2,}/g, ' ')

    /* Remove trailing whitespace at the beginning and at the end */
    .replace(/^\s+|\s+$/, '');

  /* Cut string at size but preserve word */
  const cutRegex = new RegExp(`^(.{${length}}[^\\s]*).*`, 'g');
  const cuttedText = preparedText.replace(cutRegex, '$1');

  return `${cuttedText}${ellipsis ? '...' : ''}`;
}

export async function autoNotifyUgc(
  ugc: UGCArticleType,
  { client }: { client: any }
) {
  try {
    const title = prepareNotif(ugc.data.title, 60, false);
    const content = prepareNotif(ugc.data.content);

    const buildNotifyData = {
      appId: ugc.appId,
      notifyAt: new Date(),
      type: 'userArticleAuto',
      data: {
        ugcId: ugc._id,
        content,
        title,
      },
    };

    const response = await lambda.send(
      new InvokeCommand({
        InvocationType: 'Event',
        FunctionName: `blast-${STAGE}-queueNotifications`,
        Payload: JSON.stringify(buildNotifyData),
      })
    );

    const { queueId } = JSON.parse(response.Payload?.toString() || '');

    if (queueId) {
      await client
        .db()
        .collection(COLL_USER_GENERATED_CONTENTS)
        .updateOne(
          {
            _id: ugc._id,
          },
          {
            $set: {
              pendingNotificationQueueId: queueId,
            },
          }
        );
    }
  } catch (e) {
    console.log('autoNotifyUgc(): caught error for ugc', ugc, e);
  }
}
