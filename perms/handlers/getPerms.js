import buildResponse from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  callback(null, buildResponse({ code: 200, body: perms }));
};
