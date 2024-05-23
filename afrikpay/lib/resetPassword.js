/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { AfrikPayApi } from '../../libs/backends/afrikpay';

const { COLL_APPS } = mongoCollections;

export default async (appId, { oldPassword, newPassword }, { terminalId }) => {
  const client = await MongoClient.connect();
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new Error('app_not_found');
    }
    const afrikPayApi = new AfrikPayApi(app);
    await afrikPayApi.renewLoginTokenIfNeeded(client);

    const response = await afrikPayApi.call(
      '/api/secure/mobile/reset-password/change/v1',
      {
        method: 'POST',
        body: {
          oldPassword,
          newPassword,
          newPasswordConfirmation: newPassword,
        },
        terminalId,
      }
    );

    return response;
  } finally {
    client.close();
  }
};
