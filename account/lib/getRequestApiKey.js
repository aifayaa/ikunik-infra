import get from 'lodash/get';

export default ({ headers = {}, requestContext = {} }) => {
  const fromIdentity = get(requestContext, 'identity.apiKey');
  if (fromIdentity) return fromIdentity;

  return (
    headers['x-api-key'] ||
    headers['X-Api-Key'] ||
    headers['x-api-Key'] ||
    null
  );
};
