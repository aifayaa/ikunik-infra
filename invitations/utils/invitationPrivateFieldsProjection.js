export const invitationPrivateFields = ['challengeCode'];

export const invitationPrivateFieldsProjection = invitationPrivateFields.reduce(
  (acc, field) => {
    acc[field] = 0;
    return acc;
  },
  {}
);
