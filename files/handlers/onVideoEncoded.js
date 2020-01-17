import { MongoClient } from 'mongodb';
import uploadStatus from '../uploadStatus.json';
import response from '../../libs/httpResponses/response';

const {
  COLL_VIDEOS,
  DB_NAME,
  MONGO_URL,
  STAGE,
} = process.env;

export default async (event) => {
  const {
    Message: message,
  } = event.Records[0].Sns;

  const client = MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });

  try {
    const { state, userMetadata, outputKeyPrefix } = JSON.parse(message);
    const { id, name } = userMetadata;

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
      throw new Error('encoding_error');
    }

    // this should be done in a better way ..
    const thumbFilename = '00001.png';
    const thumbUrl = `https://crowdaa-pictures-${STAGE}.s3.amazonaws.com/${outputKeyPrefix}${thumbFilename}`;
    const url = `https://s3.amazonaws.com/video-stream-${STAGE}.crowdaa.com/${outputKeyPrefix}master.m3u8`;
    const videoDoc = {
      filename: name,
      isPublished: true,
      status: uploadStatus.READY,
      thumbFileObj_ID: null,
      thumbFilename,
      thumbUrl,
      url,
    };

    await client.db(DB_NAME)
      .collection(COLL_VIDEOS)
      .updateOne(
        { _id: userMetadata.id },
        { $set: videoDoc },
      );

    return response({ code: 200, body: 'ok' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
