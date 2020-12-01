import Lambda from 'aws-sdk/clients/lambda';
import { URL } from 'url';
import MongoClient from '../../libs/mongoClient';

import generateSignedURL from '../../libs/aws/generateSignedURL';
import isMediaLocked from './isMediaLocked';

const {
  COLL_AUDIOS,
  COLL_PICTURES,
  COLL_VIDEOS,
  DB_NAME,
  STAGE,
  REGION,
} = process.env;

const lambda = new Lambda({
  region: REGION,
});

export default async (userId, appId, mediumType, mediumId) => {
  const client = await MongoClient.connect();
  try {
    const query = {
      _id: mediumId,
      appIds: appId,
    };
    let medium;
    switch (mediumType) {
      case 'audio':
        medium = await client
          .db(DB_NAME)
          .collection(COLL_AUDIOS)
          .findOne(query);
        break;
      case 'video':
        medium = await client
          .db(DB_NAME)
          .collection(COLL_VIDEOS)
          .findOne(query);
        break;
      case 'all':
        medium = await client
          .db(DB_NAME)
          .collection(COLL_AUDIOS)
          .findOne(query);
        if (!medium) {
          medium = await client
            .db(DB_NAME)
            .collection(COLL_VIDEOS)
            .findOne(query);
        }
        break;
      default:
        throw new Error('wrong type');
    }
    if (!medium) throw new Error('medium not found');
    if (medium.pictureId) {
      // get picture
      const picture = await client
        .db(DB_NAME)
        .collection(COLL_PICTURES)
        .findOne({ _id: medium.pictureId });
      if (picture) {
        medium.picture = picture;
      }
    }
    if (medium.collection && medium.filename && medium.fileObj_ID && medium.url) {
      medium.url = generateSignedURL(
        `${medium.collection === 'audio' ? 'MusicStorage' : 'VideoStorage'}/${medium.fileObj_ID}-${
          medium.filename
        }`,
        new URL(medium.url).host,
      );
    }

    const params = {
      FunctionName: `subscriptions-${STAGE}-isUserSubscribed`,
      Payload: JSON.stringify({ userId, subIds: medium.subscriptionIds, appId }),
    };
    const { Payload } = await lambda.invoke(params).promise();
    const { body } = JSON.parse(Payload);
    if (!JSON.parse(body)) {
      delete medium.url;
      delete medium.video480Url;
      medium.isLocked = true;
    }
    const { state } = await isMediaLocked(userId, appId, medium);
    // medium.isLocked = isLocked; TO NOT imply mobile diff
    medium.lockState = state;
    return medium;
  } finally {
    client.close();
  }
};
