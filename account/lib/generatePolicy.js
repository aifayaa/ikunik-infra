export default (Effect, Resource, principalId, roles) => {
  const policy = {
    principalId,
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
  if (roles) {
    policy.context = {
      roles: JSON.stringify(roles),
    };
  }
  return policy;
};
