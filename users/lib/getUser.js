import { MongoClient } from 'mongodb';
import getProfile from './getProfile';

export default async (userId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    console.log(userId, appId);
    const profile = await getProfile(userId, appId);
    const user = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_USERS)
      .findOne({ _id: userId });
    if (profile) {
      user.hasArtistProfile = true;
    }
    return user;
  } finally {
    client.close();
  }
};
