import { AppLiveStreamType } from './appLiveStreamTypes';

/* eslint-disable import/no-relative-packages */
export function filterOutput(
  input: AppLiveStreamType,
  includeStreamingKey = false
) {
  return {
    _id: input._id,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    appId: input.appId,
    startDateTime: input.startDateTime,
    expireDateTime: input.expireDateTime,
    expired: input.expired,

    ...(includeStreamingKey ? { userStreamToken: input.userStreamToken } : {}),
  };
}

export const ALS_EXPIRATION_DELAY_MIN = 2 * 24 * 60; // 2 days
export const ALS_EXPIRATION_DELAY_MS = 1 * ALS_EXPIRATION_DELAY_MIN * 60 * 1000;
