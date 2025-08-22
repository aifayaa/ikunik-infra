import { ObjectID } from '../../libs/mongoClient';

export type AppLiveStreamRecordingType = {
  start: Date;
  duration: number;
  baseUrl: string;
  root: string;

} & (
  | {
      state: 'started' | 'failed';
    }
  | {
      state: 'ended';
      playlist: string;
      thumbnailPath: string;
      end: Date;
      pressArticleId?: string;
    }
);

export type AppLiveStreamType = {
  _id: string;
  createdAt: Date;
  createdBy: string;
  appId: string;
  startDateTime: Date;
  expireDateTime: Date;
  categoryId: string;

  userStreamToken: string;
  userParticipantId: string;

  aws: {
    ivsStageName: string;
    ivsStageArn: string;
    ivsChatRoomArn: string;
  };

  state: {
    isExpired: boolean;
    isStreaming: boolean;
    lastUpdate: Date;
    viewersCount: number;
    maxViewersCount: number;
  };

  recordings?: Array<AppLiveStreamRecordingType>;
  messagesCount?: number;
  streamWatcherId?: string;
};

export type AppLiveStreamTokenType = {
  _id: ObjectID;
  liveStreamId: string;
  appId: string;
  deviceId: string;
  participantId: string;
  token: string;
  userId: string | null;
  expiresAt: Date;
  previewOnly: boolean;
};

export type AppLiveStreamStartNotificationDataType = {
  appId: string;
  notifyAt: Date;
  type: 'appLiveStreamStart';
  data: {
    liveStreamId: string;
  };
};

export type AppLiveStreamLogLineType = {
  _id: ObjectID;
  appId: string;
  liveStreamId: string;
  s3bucket: string;
  s3Key: string;
  awsId: string;
  sendTime: Date;

  content: string;
  userId: string;
  username: string;

  attributes: {
    messageType?: 'heart_reaction' | 'stream_status' | 'viewer_join';
    reactionData?: string;
  };
};
