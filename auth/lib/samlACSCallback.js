/* eslint-disable import/no-relative-packages */
import xmlParser from 'fast-xml-parser';
import MongoClient from '../../libs/mongoClient';
import Random from '../../libs/account_utils/random.ts';
import hashLoginToken from './hashLoginToken.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import postLoginChecks from './postLoginChecks.ts';
import { WordpressAPI } from '../../libs/backends/wordpress';
import { objGet } from '../../libs/utils';

const { COLL_APPS, COLL_SAML_LOGINS, COLL_USERS, COLL_USER_BADGES } =
  mongoCollections;

export default async (loginXmlData) => {
  const client = await MongoClient.connect();

  try {
    const parsedResponse = xmlParser.parse(loginXmlData, {
      ignoreAttributes: false,
    });

    const requestId = parsedResponse['saml2p:Response']['@_InResponseTo'];
    const expiresAt = { $gte: new Date() };
    const samlLoginRequest = await client
      .db()
      .collection(COLL_SAML_LOGINS)
      .findOne({
        requestId,
        expiresAt,
      });

    if (!samlLoginRequest) {
      throw new Error(
        `Login request not found or expired. requestId='${requestId}'`
      );
    }

    const { appId, loginParameters } = samlLoginRequest;

    const app = await client.db().collection(COLL_APPS).findOne({
      _id: appId,
    });

    if (
      !appId ||
      !app ||
      !app.settings ||
      !app.settings.saml ||
      !app.settings.saml.fields
    ) {
      throw new Error('App not found');
    }

    const responseStatus = objGet(parsedResponse, [
      'saml2p:Response',
      'saml2p:Status',
      'saml2p:StatusCode',
      '@_Value',
    ]);
    if (responseStatus !== 'urn:oasis:names:tc:SAML:2.0:status:Success') {
      throw new Error(`Login process failed : ${responseStatus}`);
    }

    const responseAttributes = objGet(parsedResponse, [
      'saml2p:Response',
      'saml2:Assertion',
      'saml2:AttributeStatement',
      'saml2:Attribute',
    ]);
    const attributes = responseAttributes.reduce((acc, itm) => {
      const k = itm['@_Name'];
      const v = itm['saml2:AttributeValue'];
      acc[k] = v;
      return acc;
    }, {});

    const { fields: appSamlFields } = app.settings.saml;

    const userLookup = {};
    const userFields = {};
    appSamlFields.forEach(
      ({ name, required = false, isUidKey = false, location }) => {
        if (!attributes[name] && required) {
          throw new Error(`Missing "${name}" field in server response`);
        }

        if (attributes[name] !== undefined) {
          if (isUidKey) {
            userLookup[location] = attributes[name];
          }
          userFields[location] = attributes[name];
        }
      }
    );

    if (Object.keys(userLookup).length === 0) {
      throw new Error('Missing identification field in server response');
    }

    const users = await client
      .db()
      .collection(COLL_USERS)
      .find({
        ...userLookup,
        appId,
      })
      .toArray();

    let userId;
    let user;
    let newUser = null;
    if (users.length === 0) {
      newUser = true;
      userId = Random.id();

      const badges = (
        await client
          .db()
          .collection(COLL_USER_BADGES)
          .find({ appId, isDefault: true })
          .toArray()
      ).map((badge) => ({
        id: badge._id,
        status: 'assigned',
      }));

      const username = `user_${Random.id()}`;
      user = {
        _id: userId,
        createdAt: new Date(),
        username,
        services: {
          saml: {
            loginAt: new Date(),
          },
        },
        appId,
        profile: {
          username,
        },
        badges,
      };
      await client.db().collection(COLL_USERS).insertOne(user);
      await client.db().collection(COLL_USERS).updateOne(
        {
          appId,
          _id: userId,
        },
        { $set: userFields }
      );
    } else if (users.length === 1) {
      newUser = false;
      [user] = users;
      userId = user._id;
      await client
        .db()
        .collection(COLL_USERS)
        .updateOne(
          {
            ...userLookup,
            appId,
            _id: userId,
          },
          { $set: userFields }
        );
    } else {
      throw new Error('Multiple users found for these parameters');
    }

    await postLoginChecks({ userId }, app, 'saml-login');

    user = await client.db().collection(COLL_USERS).findOne({
      _id: userId,
    });

    const token = Random.secret();
    const dbUpdates = {};
    if (
      app.settings.saml.comptexpert &&
      app.backend &&
      app.backend.type === 'wordpress'
    ) {
      const wpApi = new WordpressAPI(app);
      const reply = await wpApi.call(
        'POST',
        '/crowdaa-sync/v1/comptexpert/samlLoginFromAPI',
        {
          profile: user.profile,
          badges: (user.badges || []).map(({ id }) => id),
          isNewUser: newUser,
        }
      );

      const wpToken = reply.token;
      const dbLoginToken = {
        hashedToken: hashLoginToken(token),
        when: new Date(),
        backend: 'wordpress',
        wpToken,
        expiresAt: Date.now() + 365 * 86400 * 1000,
      };
      dbUpdates.$push = { 'services.resume.loginTokens': dbLoginToken };
      dbUpdates.$set = { 'services.wordpress.userId': reply.user_id };
      if (reply.autologin_token) {
        dbUpdates.$set['services.wordpress.autoLoginToken'] =
          reply.autologin_token;
        user.services.wordpress = {
          autoLoginToken: reply.autologin_token,
        };
      }
    } else {
      const dbLoginToken = {
        hashedToken: hashLoginToken(token),
        when: new Date(),
      };
      dbUpdates.$push = { 'services.resume.loginTokens': dbLoginToken };
    }

    await client.db().collection(COLL_USERS).updateOne(
      {
        _id: userId,
        appId,
      },
      dbUpdates
    );

    let successRetVal;
    try {
      successRetVal = new URL(loginParameters.onSuccessUrl);
      successRetVal.searchParams.append('userId', userId);
      successRetVal.searchParams.append('username', user.username);
      successRetVal.searchParams.append(
        'profileUsername',
        user.profile.username
      );
      successRetVal.searchParams.append('authToken', token);
      successRetVal.searchParams.append('authType', 'saml');
      successRetVal.searchParams.append(
        'autoLoginToken',
        user.services.wordpress && user.services.wordpress.autoLoginToken
      );
      successRetVal = successRetVal.toString();
    } catch (e) {
      successRetVal = {
        userId,
        authToken: token,
        authType: 'saml',
        autoLoginToken:
          user.services.wordpress && user.services.wordpress.autoLoginToken,
      };
    }

    await client
      .db()
      .collection(COLL_SAML_LOGINS)
      .deleteOne({ _id: samlLoginRequest._id });

    return successRetVal.toString();
  } finally {
    client.close();
  }
};
