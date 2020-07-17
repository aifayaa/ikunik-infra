import MongoClient from '../../libs/mongoClient';
import uploadStatus from '../uploadStatus.json';
import response from '../../libs/httpResponses/response';

const {
  COLL_VIDEOS,
  DB_NAME,
} = process.env;

export default async (event) => {
  const {
    Message: message,
  } = event.Records[0].Sns;

  const client = await MongoClient.connect();

  try {
    const { state, userMetadata } = JSON.parse(message);
    const { id } = userMetadata;

    const document = await client.db(DB_NAME)
      .collection(COLL_VIDEOS)
      .findOne({
        _id: id,
      });

    if (!document) {
      throw new Error('document_not_found');
    }

    if (state !== 'COMPLETED') {
      await client.db(DB_NAME)
        .collection(COLL_VIDEOS)
        .updateOne(
          { _id: id },
          { $set: { status: uploadStatus.ENCODING_ERROR } },
        );
    }

    return response({ code: 200, body: 'ok' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
