/* eslint-disable import/no-relative-packages */
export function filterOutput(input, includeStreamingKey = false) {
  return {
    _id: input._id,
    appId: input.appId,
    createdAt: input.createdAt,
    startDateTime: input.startDateTime,
    expireDateTime: input.expireDateTime,
    displayName: input.displayName,
    expired: input.expired,

    ...(includeStreamingKey ? { userStreamToken: input.userStreamToken } : {}),
  };
}

export const ALS_EXPIRATION_DELAY_MIN = 2 * 24 * 60; // 2 days
export const ALS_EXPIRATION_DELAY_MS = 1 * ALS_EXPIRATION_DELAY_MIN * 60 * 1000;
