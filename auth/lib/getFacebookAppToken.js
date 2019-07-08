/* eslint-disable camelcase */
import request from 'request-promise-native';

const {
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,
} = process.env;

export default async () => {
  const appTokenUrl = `https://graph.facebook.com/oauth/access_token?client_id=${FACEBOOK_CLIENT_ID}` +
    `&client_secret=${FACEBOOK_CLIENT_SECRET}&grant_type=client_credentials`;
  const getAppToken = await request({
    method: 'GET',
    url: appTokenUrl,
  });
  const appToken = JSON.parse(getAppToken).access_token;
  return appToken;
};
