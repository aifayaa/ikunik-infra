export function filterOutput(input) {
  return ({
    _id: input._id,
    createdAt: input.createdAt,
    startDateTime: input.startDateTime,
    endDateTime: input.endDateTime,
    displayName: input.displayName,
    height: input.height,
    width: input.width,
    state: input.state,
    broadcastLocation: input.broadcastLocation,
    inputParameters: input.inputParameters,
    hostedPageUrl: input.hostedPageUrl,
  });
}
