import { ObjectID } from '../../libs/mongoClient';

export type AppLiveStreamType = {
  _id: string;
  createdAt: Date;
  createdBy: string;
  appId: string;
  startDateTime: Date;
  expireDateTime: Date;

  userStreamToken: string;
  userParticipantId: string;

  aws: {
    ivsStageName: string;
    ivsStageArn: string;
  };

  state: {
    isExpired: boolean;
    isStreaming: boolean;
    lastUpdate: Date;
    viewersCount: number;
  };
};

export type AppLiveStreamTokenType = {
  _id: ObjectID;
  liveStreamId: string;
  appId: string;
  deviceId: string;
  participantId: string;
  token: string;
};
