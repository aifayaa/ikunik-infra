import MongoClient from '../libs/mongoClient';
import mongoCollections from '../libs/mongoCollections.json';
import response from '../libs/httpResponses/response';

const { COLL_BANNERS } = mongoCollections;

const doGetBanners = async (appId) => {
  const client = await MongoClient.connect();
  try {
    const selector = {
      appId,
    };

    const banners = await client.db().collection(COLL_BANNERS)
      .find(selector, { sort: [['date', -1]] }).toArray();
    return { banners };
  } finally {
    client.close();
  }
};

export const handleGetBanners = async (event, context, callback) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const results = await doGetBanners(appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
