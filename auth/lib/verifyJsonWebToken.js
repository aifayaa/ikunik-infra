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
export default async (token, appId) => {
  const { DB_NAME, COLL_APPS } = process.env;
  const mongoClient = await MongoClient.connect();
  try {
    const {
      header,
    } = await jwt.decode(token, { complete: true });
    const app = await mongoClient
      .db(DB_NAME)
      .collection(COLL_APPS)
      .findOne({ _id: appId }, { projection: { 'settings.auth': true } });

    if (!app) throw new Error('app_not_found');
    // get keys for appId
    const auth = get(app, 'settings.auth', {});
    const { kid } = header;
    const { jwksUrl = 'https://keycloak-dev.aws.crowdaa.com:8443/auth/realms/leQuotidien_sso_test/protocol/openid-connect/certs' } = auth;
    const jwks = jwksClient({
      jwksUri: jwksUrl,
    });
    const getSigningKey = promisify(jwks.getSigningKey);
    const signingKey = await getSigningKey(kid);
    return await verify(token, signingKey.getPublicKey());
  } catch (e) {
    throw new Error('invalid_token');
  } finally {
    mongoClient.close();
  }
};
