/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { AfrikPayApi } from '../../libs/backends/afrikpay';

const { COLL_APPS } = mongoCollections;

export default async (
  appId,
  {
    birthday,
    email,
    firstname,
    gender,
    idNumber,
    language,
    lastname,
    password,
    phone,
  },
  { terminalId }
) => {
  const client = await MongoClient.connect();
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new Error('app_not_found');
    }
    const afrikPayApi = new AfrikPayApi(app);

    const registerResp = await afrikPayApi.call(
      '/api/unsecure/partner/register/v1',
      {
        method: 'POST',
        body: {
          userGroup: 'client_local_group',
          name: `${lastname} ${firstname}`,
          username: phone,
          password,
          email,
          phone,
          gender,
          idNumber,
          birthday,
          language,
        },
        terminalId,
      }
    );

    if (registerResp.code !== 200) {
      if (registerResp.result) {
        throw new Error(registerResp.result.errorMessage);
      } else {
        throw new Error(registerResp.message);
      }
    }

    return registerResp;
  } finally {
    client.close();
  }
};
