import get from 'lodash/get';
import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import MongoClient from '../../libs/mongoClient';

const verify = promisify(jwt.verify);

/**
 * Verify JWToken validity using jwks define in app settings
 * It returns parse token payload
 *
 * @param {string} token
 * @param {string} appId
 * @returns {Object}
 */
export default async (token, appId, { mongoClient }) => {
  const { DB_NAME, COLL_APPS } = process.env;
  const client = mongoClient || await MongoClient.connect();
  try {
    const {
      header,
    } = await jwt.decode(token, { complete: true });
    const app = await client
      .db(DB_NAME)
      .collection(COLL_APPS)
      .findOne({ _id: appId }, { projection: { 'settings.auth': true } });

    if (!app) throw new Error('app_not_found');
    // get keys for appId
    const auth = get(app, 'settings.auth', {});
    const { kid } = header;
    const { jwksUrl } = auth;
    if (!jwksUrl) throw new Error('OIDC_login_not_enabled');

    const jwks = jwksClient({
      jwksUri: jwksUrl,
    });
    const getSigningKey = promisify(jwks.getSigningKey);
    const signingKey = await getSigningKey(kid);
    return await verify(token, signingKey.getPublicKey());
  } catch (e) {
    throw new Error('invalid_token');
  } finally {
    if (!mongoClient) {
      client.close();
    }
  }
};
