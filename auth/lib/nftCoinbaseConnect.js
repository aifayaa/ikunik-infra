import request from 'request-promise-native';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_USERS,
} = mongoCollections;

const CROWDAA_COINBASE_OAUTH_CLIENT_ID = '470acbfd6bce7a7f0c0f96a3a196935d7305d28e97ba756a1be18376916e7100';
const CROWDAA_COINBASE_OAUTH_CLIENT_SECRET = 'fb4217a0fec91e4ea2638aaf95e3f1fc09634b0b7cd94e020b8715126adbbce1';
const CROWDAA_COINBASE_OAUTH_REDIRECT_URL = 'urn:ietf:wg:oauth:2.0:oob';
const CROWDAA_COINBASE_API_VERSION_HEADER = {
  'CB-VERSION': '2022-02-18',
};

export const nftCoinbaseConnect = async (userId, code, appId) => {
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db().collection(COLL_USERS);

    const user = await usersCollection.findOne({ _id: userId, appId });
    if (!user) {
      throw new Error('user_not_found');
    }

    let params = {
      method: 'POST',
      uri: 'https://api.coinbase.com/oauth/token',
      json: {
        grant_type: 'authorization_code',
        code,
        client_id: CROWDAA_COINBASE_OAUTH_CLIENT_ID,
        client_secret: CROWDAA_COINBASE_OAUTH_CLIENT_SECRET,
        redirect_uri: CROWDAA_COINBASE_OAUTH_REDIRECT_URL,
      },
      headers: {
        ...CROWDAA_COINBASE_API_VERSION_HEADER,
      },
    };

    let response = await request(params);

    const {
      access_token: accessToken,
      // token_type, => bearer
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope,
    } = response;

    await usersCollection.updateOne({ _id: userId, appId }, {
      $set: {
        'services.coinbase': {
          accessToken,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
          refreshToken,
          scope,
        },
      },
    });

    params = {
      method: 'GET',
      uri: 'https://api.coinbase.com/v2/accounts',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...CROWDAA_COINBASE_API_VERSION_HEADER,
      },
    };

    response = await request(params);
    if (typeof response === 'string') {
      response = JSON.parse(response);
    }

    console.log('ACCNTS', response);

    let wallets = [];

    const promises = response.data.map(async ({ id: accountId }) => {
      console.log('LXFOR', accountId);
      params = {
        method: 'GET',
        uri: `https://api.coinbase.com/v2/accounts/${accountId}/addresses`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...CROWDAA_COINBASE_API_VERSION_HEADER,
        },
      };

      response = await request(params);
      if (typeof response === 'string') {
        response = JSON.parse(response);
      }
      console.log('WLET1', response);

      wallets = wallets.concat(response.data);
    });

    await Promise.all(promises);

    console.log('WALALETZ', wallets);
    wallets = wallets.map(({ address }) => (address));
    console.log('WALLALETZ2', wallets);

    const action = {};
    if (!user.crypto || !user.crypto.wallets || !user.crypto.wallets.ETH) {
      action.$set = { 'crypto.wallets.ETH': wallets };
    } else {
      action.$addToSet = { 'crypto.wallets.ETH': { $each: wallets } };
    }

    await client.db().collection(COLL_USERS).updateOne({
      appId,
      _id: userId,
    }, action);

    return ({
      ok: true,
      expiresIn,
    });
  } finally {
    client.close();
  }
};
