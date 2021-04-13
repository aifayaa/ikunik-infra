import crypto from 'crypto';
import request from 'request-promise-native';

// const WOWZA_API_URL = 'https://api.cloud.wowza.com';
const WOWZA_API_URL = 'https://api-sandbox.cloud.wowza.com';
const WOWZA_API_BASE = '/api/v1.6';
// const WOWZA_API_KEY = 'QZloLCBrr4DOgT7COdRAuQSFJjrnMgTNKl53Z6DFZazxA7LQfFG57UoJf1O53125';
// const WOWZA_ACCESS_KEY = 'sVOYeHhhQ1xOtPSsY41HZYagIrbKf80UFucRFPqBG8jD8EraMh4Cy2RPsqKP330f';
const WOWZA_API_KEY = '1R6yCr2JQGRDJFjAjvQWMMixUwH50WZizNsxdIffkY5Ijc8XJiwWe28617zv331f';
const WOWZA_ACCESS_KEY = 'gaETz3rVaNcQbAuk9aAMeNrQpkqnQCP7Mg9Wkmm6dBmdVNmXFof6PxR2xxiM355d';

export default async (method, uri, body = {}) => {
  const path = `${WOWZA_API_BASE}${uri}`;
  const timestamp = Math.round(new Date().getTime() / 1000);
  const hmacData = `${timestamp}:${path}:${WOWZA_API_KEY}`;
  const signature = crypto.createHmac('sha256', WOWZA_API_KEY).update(hmacData).digest('hex');

  let response;
  try {
    response = await request({
      method,
      uri: `${WOWZA_API_URL}${path}`,
      headers: {
        'wsc-access-key': WOWZA_ACCESS_KEY,
        'wsc-timestamp': timestamp,
        'wsc-signature': signature,
      },
      body,
      json: true,
    });
  } catch (e) {
    if (e.statusCode >= 400) {
      const { body: responseBody } = e.response;
      throw new Error(`${responseBody.meta.code} : ${responseBody.meta.message}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`Wowza API: Error when calling ${method} ${uri} api : ${e}`);
      response = e.response;
    }
  }

  return (response);
};
