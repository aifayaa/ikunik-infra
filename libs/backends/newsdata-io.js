/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';

const BASE_URL = 'https://newsdata.io/api/1/news';
const APIKEY = 'pub_21679acf2b92336b1e7014ae26502b9ca0b98';

function NewsDataIO() {}

NewsDataIO.prototype.getNews = async function call(
  newsParams = {},
  options = {}
) {
  const url = new URL(`${BASE_URL}`);
  Object.keys(newsParams).forEach((key) => {
    url.searchParams.append(key, newsParams[key]);
  });
  url.searchParams.append('apikey', APIKEY);
  const params = {
    method: 'GET',
    uri: url.toString(),
    headers: {},
  };

  if (options.headers) {
    params.headers = {
      ...params.headers,
      ...options.headers,
    };
  }

  const rawResponse = await request(params);

  try {
    const jsonResponse = JSON.parse(rawResponse);
    return jsonResponse;
  } catch (e) {
    /* do nothing */
  }

  return rawResponse;
};

export { NewsDataIO };
