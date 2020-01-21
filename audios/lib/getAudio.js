import { URL } from 'url';
import MongoClient from '../../libs/mongoClient';

import generateSignedURL from '../../libs/aws/generateSignedURL';

export default async (audioId, appId) => {
  const {
    DB_NAME,
    COLL_AUDIOS,
  } = process.env;

  const client = await MongoClient.connect();
  try {
    const audio = await client
      .db(DB_NAME)
      .collection(COLL_AUDIOS)
      .findOne({
        _id: audioId,
        appIds: { $elemMatch: { $eq: appId } },
      });
    if (audio.filename && audio.fileObj_ID && audio.url) {
      audio.url = generateSignedURL(
        `MusicStorage/${audio.fileObj_ID}-${audio.filename}`,
        new URL(audio.url).host,
      );
    }
    return audio;
  } finally {
    client.close();
  }
};
