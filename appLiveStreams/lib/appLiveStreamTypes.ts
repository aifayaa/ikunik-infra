export type AppLiveStreamType = {
  _id: string;
  createdAt: Date;
  createdBy: string;
  appId: string;
  startDateTime: Date;
  expireDateTime: Date;
  expired: boolean;

  appStreamToken: string;

  aws: {
    ivsStageName: string;
    ivsStageArn: string;
  };
};
