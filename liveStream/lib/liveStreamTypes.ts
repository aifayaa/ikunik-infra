import { LIVESTREAM_PROVIDER_AWS_IVS } from './constants';

type LiveStreamCommonType = {
  _id: string;
  createdAt: Date;
  createdBy: string;
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

export type LiveStreamAwsIvsType = LiveStreamCommonType & {
  provider: typeof LIVESTREAM_PROVIDER_AWS_IVS;
};

export type LiveStreamType = LiveStreamAwsIvsType;

export type LiveStreamDurationType = {
  liveStreamId: string;
  appId: string;
  awsStreamId: string;
  type: typeof LIVESTREAM_PROVIDER_AWS_IVS;
  startTime?: Date;
  endTime?: Date;
  duration: number;
};
