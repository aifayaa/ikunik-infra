import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  callback(null, response({ code: 502, message: 'not_implemented' }));
};
