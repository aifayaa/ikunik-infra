import {
  LIVESTREAM_PROVIDER_AWS_IVS,
  LIVESTREAM_PROVIDER_AWS_IVS_APP,
} from './constants';

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

export type LiveStreamAwsIvsAppType = LiveStreamCommonType & {
  provider: typeof LIVESTREAM_PROVIDER_AWS_IVS_APP;
  appStreamToken: string;
  aws: {
    stageArn: string;
    encoderArn: string;
    compositionArn: string;
  };
};

export type LiveStreamType = LiveStreamAwsIvsType | LiveStreamAwsIvsAppType;

export type LiveStreamDurationType = {
  liveStreamId: string;
  appId: string;
  awsStreamId: string;
  type:
    | typeof LIVESTREAM_PROVIDER_AWS_IVS
    | typeof LIVESTREAM_PROVIDER_AWS_IVS_APP;
  startTime?: Date;
  endTime?: Date;
  duration: number;
};
