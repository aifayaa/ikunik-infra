import { MongoClient } from 'mongodb';
import response from '../libs/httpResponses/response';

const { MONGO_URL, DB_NAME, COLL_BANNERS } = process.env;
const doGetBanners = async (appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
  try {
    const selector = {
      appIds: {
        $elemMatch: {
          $eq: appId,
        },
      },
    };

    const banners = await client.db(DB_NAME).collection(COLL_BANNERS)
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
