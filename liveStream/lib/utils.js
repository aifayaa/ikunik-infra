/* eslint-disable import/no-relative-packages */
export function filterOutput(input) {
  return {
    _id: input._id,
    appId: input.appId,
    createdAt: input.createdAt,
    startDateTime: input.startDateTime,
    expireDateTime: input.expireDateTime,
    displayName: input.displayName,
    expired: input.expired,

    ingestEndpoint: input.ingestEndpoint,
    streamKey: input.streamKey,
    playbackUrl: input.playbackUrl,
    appStreamToken: input.appStreamToken,

    recordings: input.recordings,
  };
}
