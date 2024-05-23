/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import uploadStatus from '../uploadStatus.json';
import response from '../../libs/httpResponses/response';

const { COLL_VIDEOS } = mongoCollections;

export default async (event) => {
  const { Message: message } = event.Records[0].Sns;

  const client = await MongoClient.connect();

  try {
    const { state, userMetadata } = JSON.parse(message);
    const { id } = userMetadata;

    const document = await client.db().collection(COLL_VIDEOS).findOne({
      _id: id,
    });

    if (!document) {
      throw new Error('document_not_found');
    }

    if (state !== 'COMPLETED') {
      await client
        .db()
        .collection(COLL_VIDEOS)
        .updateOne(
          { _id: id },
          { $set: { status: uploadStatus.ENCODING_ERROR } }
        );
    }

    return response({ code: 200, body: 'ok' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
