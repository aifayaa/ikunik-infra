import response from '../../libs/httpResponses/response';
import supportedFormats from '../supportedFormats.json';

export default () => new Promise((resolve) => resolve(response({
  body: supportedFormats,
  code: 200,
})));
