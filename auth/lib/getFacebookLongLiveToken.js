/* eslint-disable camelcase */
import request from 'request-promise-native';

const {
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,
} = process.env;

export const getFacebookLongLiveToken = async (
  userToken,
  appToken,
  {
    appId = FACEBOOK_CLIENT_ID,
    appSecret = FACEBOOK_CLIENT_SECRET,
  } = {}) => {
  // get a long live token
  const longLifeTokenResp = await request.get({
    url:
      'https://graph.facebook.com/oauth/access_token?' +
      'grant_type=fb_exchange_token&' +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `fb_exchange_token=${userToken}`,
  });
  const longLifeToken = JSON.parse(longLifeTokenResp);

  const { access_token } = longLifeToken;

  // get info about this LLToken
  const debugToken = await request.get({
    url: `https://graph.facebook.com/debug_token?input_token=${access_token}&access_token=${appToken}`,
  });
  const debugTokenData = JSON.parse(debugToken).data;

  const { user_id, expires_at } = debugTokenData;

  return {
    accessToken: access_token,
    expiresAt: expires_at,
    fbUserId: user_id,
  };
};
