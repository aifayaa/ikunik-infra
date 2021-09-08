export default (Effect, _Resource, { userId, profileId, roles, perms, appId, loginToken } = {}) => {
  const policy = {
    principalId: userId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect,
          Resource: '*',
        },
      ],
    },
  };
  policy.context = {
    perms: '{}',
  };
  if (roles) {
    policy.context.roles = JSON.stringify(roles);
  }
  if (perms) {
    policy.context.perms = JSON.stringify(perms);
  }
  if (loginToken) {
    policy.context.loginToken = JSON.stringify(loginToken);
  }
  if (appId) {
    policy.context.appId = appId;
  }
  if (profileId) {
    policy.context.profileId = profileId;
  }
  return policy;
};
