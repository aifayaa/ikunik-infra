import response from '../../libs/httpResponses/response';

export default (event) => {
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  return new Promise((resolve) => {
    resolve(response({ code: 200, body: perms }));
  });
};
