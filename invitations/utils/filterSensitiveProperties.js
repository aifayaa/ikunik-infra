/* eslint-disable import/no-relative-packages */

export const filterSensitiveProperties = (invitationDocument) => {
  const filtered = {
    ...invitationDocument,
  };
  delete filtered.challengeCode;

  return filtered;
};
