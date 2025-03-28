/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import uploadStatus from '../uploadStatus.json';
import response from '../../libs/httpResponses/response.ts';

const { COLL_VIDEOS } = mongoCollections;

export default async (event) => {
  const { Message: message } = event.Records[0].Sns;

  const client = await MongoClient.connect();

  try {
    const {
      state,
      userMetadata,
      playlists = [],
      outputs = [],
    } = JSON.parse(message);
    const { id } = userMetadata;

    const document = await client.db().collection(COLL_VIDEOS).findOne({
      _id: id,
    });

    if (!document) {
      throw new Error('document_not_found');
    }

    if (state !== 'COMPLETED') {
      const rawErrors = []
        .concat(playlists, outputs)
        .filter(({ status = '' }) => status.toLowerCase() === 'error')
        .map(({ statusDetail }) => statusDetail);
      const errors = rawErrors
        .map((e) => {
          const parts = e.split(/:/g);
          parts.shift();
          return parts.join(':').trim();
        })
        .reduce((acc, e) => {
          if (acc.indexOf(e) < 0) {
            acc.push(e);
          }
          return acc;
        }, []);
      await client
        .db()
        .collection(COLL_VIDEOS)
        .updateOne(
          { _id: id },
          {
            $set: {
              status: uploadStatus.ENCODING_ERROR,
              rawErrors,
              errors,
            },
          }
        );
    }

    return response({ code: 200, body: 'ok' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
