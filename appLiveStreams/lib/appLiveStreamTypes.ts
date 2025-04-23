export type AppLiveStreamType = {
  _id: string;
  createdAt: Date;
  createdBy: string;
  appId: string;
  startDateTime: Date;
  expireDateTime: Date;
  expired: boolean;

  userStreamToken: string;

  aws: {
    ivsStageName: string;
    ivsStageArn: string;
  };
};
