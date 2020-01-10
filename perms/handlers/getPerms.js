import buildResponse from '../../libs/httpResponses/response';

export default (event) => {
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  return buildResponse({ code: 200, body: perms });
};
