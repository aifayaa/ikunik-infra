/* eslint-disable import/no-relative-packages */
/* eslint-disable camelcase */
import request from 'request-promise-native';

const { FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET } = process.env;

export const getFacebookAppToken = async ({
  appId = FACEBOOK_CLIENT_ID,
  appSecret = FACEBOOK_CLIENT_SECRET,
} = {}) => {
  const appTokenUrl =
    `https://graph.facebook.com/oauth/access_token?client_id=${appId}` +
    `&client_secret=${appSecret}&grant_type=client_credentials`;
  const getAppToken = await request.get({
    url: appTokenUrl,
  });
  const appToken = JSON.parse(getAppToken).access_token;
  return appToken;
};
