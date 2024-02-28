/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_AI_QUERIES } = mongoCollections;

export async function generatedContentStatus(queryId, { appId, userId }) {
  const client = await MongoClient.connect();

  try {
    const query = await client
      .db()
      .collection(COLL_AI_QUERIES)
      .findOne({ _id: ObjectID(queryId), appId, userId });

    if (!query) {
      throw new Error('content_not_found');
    }

    if (query.error) {
      return {
        started: true,
        ended: false,
        error: query.error,
      };
    }
    if (query.processingEndTime) {
      const generatedContent = query.parts.reduce(
        (acc, { field, response }) => {
          acc[field] = response;
          return acc;
        },
        {}
      );
      return {
        started: true,
        ended: true,
        generatedContent,
      };
    }
    if (query.processingStartTime) {
      return {
        started: true,
        ended: false,
      };
    }

    return {
      started: false,
      ended: false,
    };
  } finally {
    client.close();
  }
}
