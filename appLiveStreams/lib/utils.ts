import { AppLiveStreamType } from './appLiveStreamTypes';

/* eslint-disable import/no-relative-packages */
export function filterAppLiveStreamOutput(
  input: AppLiveStreamType,
  includeStreamingKey = false
) {
  return {
    _id: input._id,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    appId: input.appId,
    title: input.title,
    image: input.image,
    startDateTime: input.startDateTime,
    expireDateTime: input.expireDateTime,
    state: input.state,

    ...(includeStreamingKey ? { userStreamToken: input.userStreamToken } : {}),
  };
}

export const ALS_EXPIRATION_DELAY_MIN = 1 * 24 * 60; // 1 day
export const ALS_EXPIRATION_DELAY_MS = 1 * ALS_EXPIRATION_DELAY_MIN * 60 * 1000;
