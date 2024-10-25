export type BookableType = {
  _id: string;
  name: string;
  appId: string;
  createdAt: string | Date;
  createdBy: string;
  updatedAt?: string | Date;
  updatedBy?: string;
  description: string;
  disabled: boolean;
  limits: {
    notBefore: string | Date;
    notAfter: string | Date;
    maxTickets: number;
    maxTicketsPerAccount: number;
  };
  pricingId: string | null;
  picture: null | {
    _id: string;
    thumbUrl: string;
    mediumUrl: string;
    largeUrl: string;
    pictureUrl: string;
  };
};
