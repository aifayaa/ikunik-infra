import { URL } from 'url';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

import generateSignedURL from '../../libs/aws/generateSignedURL';

export default async (audioId, appId) => {
  const {
    COLL_AUDIOS,
  } = mongoCollections;

  const client = await MongoClient.connect();
  try {
    const audio = await client
      .db()
      .collection(COLL_AUDIOS)
      .findOne({
        _id: audioId,
        appId,
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
