import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';
import { MyFidApi } from '../../../libs/backends/ghanty-myfid';

const {
  COLL_APPS,
  COLL_USERS,
} = mongoCollections;

export default async (
  appId,
  userId,
  {
    addressCity,
    addressCountry,
    addressLine1,
    addressLine2,
    addressPostalCode,
    allowEmail,
    allowSms,
    birthday,
    civility,
    email,
    favoriteBrand1,
    favoriteBrand2,
    favoriteBrand3,
    favoriteShopArea,
    firstname,
    idClient,
    lastname,
    mobilePhone,
  },
) => {
  const client = await MongoClient.connect();
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const user = await client.db().collection(COLL_USERS).findOne({ _id: userId });
    if (!app) {
      throw new Error('app_not_found');
    }
    if (!user) {
      throw new Error('user_not_found');
    }
    const fidApi = new MyFidApi(app);
    await fidApi.renewTokenIfNeeded(client);

    const response = await fidApi.call(`/users/${user.username}/personnaldata`, {
      method: 'POST',
      body: {
        addressCity,
        addressCountry,
        addressLine1,
        addressLine2,
        addressPostalCode,
        allowEmail,
        allowSms,
        birthday,
        civility,
        email,
        favoriteBrand1,
        favoriteBrand2,
        favoriteBrand3,
        favoriteShopArea,
        firstname,
        idClient,
        lastname,
        mobilePhone,
      },
    });

    return (response);
  } finally {
    client.close();
  }
};
