import request from 'request-promise-native';

const BASE_URL = 'https://t.ly/api/v1';

const API_TOKEN = 'OnvfHm4gJiQm1YoXE1wCaAptEA3OSmZHWnwQUuJrWeE8fkbnWdPJGjIQEMPq';

export default async function call(method, path, data) {
  const uri = `${BASE_URL}${path}?api_token=${API_TOKEN}`;
  const params = {
    method,
    uri,
  };

  if (data) {
    params.json = data;
  }

  const rawResponse = await request(params);

  try {
    const jsonResponse = JSON.parse(rawResponse);
    return (jsonResponse);
  } catch (e) {
    /* do nothing */
  }

  return (rawResponse);
}
