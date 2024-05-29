/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import supportedFormatsExtensions from '../supportedFormatsExtensions.json';

const supportedFormats = Object.keys(supportedFormatsExtensions).reduce(
  (acc, k) => {
    acc[k] = true;
    return acc;
  },
  {}
);

export default () =>
  new Promise((resolve) => {
    resolve(
      response({
        body: supportedFormats,
        code: 200,
      })
    );
  });
