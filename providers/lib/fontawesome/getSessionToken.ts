/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';

const { FONTAWESOME_API_KEY } = process.env;

export type SessionToken = {
  access_token: string;
  expires_in: number;
  scopes: [string];
  token_type: string;
};

export default async () => {
  const response = await request({
    method: 'POST',
    uri: `https://api.fontawesome.com/token`,
    encoding: 'utf8',
    headers: {
      Authorization: `Bearer ${FONTAWESOME_API_KEY}`,
    },
  });

  const json = JSON.parse(response) as SessionToken;

  return json;
};
