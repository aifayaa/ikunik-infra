import { MongoClient } from 'mongodb';
import uploadStatus from '../uploadStatus.json';

const {
  COLL_VIDEOS,
  DB_NAME,
  MONGO_URL,
} = process.env;

export default async (event, _context, callback) => {
  const {
    Message: message,
  } = event.Records[0].Sns;

  const client = await MongoClient.connect(MONGO_URL, {
    useNewUrlParser: true,
  });

  const response = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };

  try {
    const { state, userMetadata } = JSON.parse(message);

    const document = await client.db(DB_NAME)
      .collection(COLL_VIDEOS)
      .findOne({
        _id: userMetadata.id,
      });

    if (!document) {
      throw new Error('document_not_found');
    }

    if (state !== 'COMPLETED') {
      await client.db(DB_NAME)
        .collection(COLL_VIDEOS)
        .updateOne(
          { _id: userMetadata.id },
          { $set: { status: uploadStatus.ENCODING_ERROR } },
        );
      throw new Error('encoding_error');
    }

    const videoDoc = {
      isPublished: true,
      status: uploadStatus.READY,
    };

    await client.db(DB_NAME)
      .collection(COLL_VIDEOS)
      .updateOne(
        { _id: userMetadata.id },
        { $set: videoDoc },
      );

    response.statusCode = 200;
    response.body = 'ok';
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: e.message,
    });
  } finally {
    client.close();
    callback(null, response);
  }
};
