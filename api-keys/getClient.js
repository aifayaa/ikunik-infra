const findKey = require('lodash/findKey');
const plan = require('./api-keys.tf.json');

export default (apiKey) => {
  const key = findKey(plan.resource.aws_api_gateway_api_key, (keys => keys.value === apiKey));
  if (!key) return 'crowdaa';
  return plan.resource.aws_api_gateway_api_key[key].name;
};
