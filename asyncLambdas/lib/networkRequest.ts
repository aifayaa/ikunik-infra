/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';

export type RequestParametersType = {
  method: string;
  url: string;
  body?: object | [any] | string | null;
  json?: object | [any] | string | null;
  headers?: object;
};

export type RequestOptionsType = {
  retries?: number;
  sleepBetweenRetries?: number;
  logErrors?: boolean;
};

export default async (
  requestData: RequestParametersType,
  requestOptions: RequestOptionsType = {}
) => {
  const retries = requestOptions.retries || 0;

  for (
    let tryCount = 0, success = false;
    !success && tryCount <= retries;
    tryCount += 1
  ) {
    try {
      await request(requestData);
      success = true;
    } catch (e) {
      if (requestOptions.logErrors) {
        console.error('Error running query', requestData, '=>', e);
      }
      if (requestOptions.sleepBetweenRetries) {
        await new Promise((resolve) => {
          setTimeout(resolve, requestOptions.sleepBetweenRetries);
        });
      }
      /* Skip */
    }
  }
};
