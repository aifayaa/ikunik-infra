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

    ...(includeStreamingKey ? { appStreamToken: input.appStreamToken } : {}),
  };
}
