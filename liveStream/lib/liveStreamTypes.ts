export type LiveStreamType = {
  _id: string;
  provider: string;
  createdAt: Date;
  appId: string;
  name: string;
  displayName: string;
  startDateTime: Date;
  expireDateTime: Date;
  expired: boolean;
  ingestEndpoint: string;
  streamKey: string;
  playbackUrl: string;
  aws: {
    arn: string;
    recordingConfigurationArn: string;
    streamKeyArn: string;
    latencyMode: string;
    type: string;
    authorized: boolean;
  };
};

export type LiveStreamDurationType = {
  liveStreamId: string;
  appId: string;
  awsStreamId: string;
  type: 'aws-ivs';
  startTime?: Date;
  endTime?: Date;
  duration: number;
};
