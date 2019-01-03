import { MongoClient } from 'mongodb';
import { URL } from 'url';

import generateSignedURL from '../libs/aws/generateSignedURL';

const doGetAudio = async (audioId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const audio = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_AUDIOS)
      .findOne({ _id: audioId });
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

export const handleGetAudio = async (event, context, callback) => {
  try {
    const audioId = event.pathParameters.id;
    const results = await doGetAudio(audioId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
