export default (Effect, Resource, principalId, roles) => ({
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
  context: {
    rolesTab: JSON.stringify(roles),
  },
});
