export const IapPollPriceIdsList = [
  'article_01',
  'article_02',
  'article_03',
  'article_04',
  'article_05',
  'article_06',
  'article_07',
  'article_08',
  'article_09',
  'article_10',
  'article_11',
  'article_12',
  'article_13',
  'article_14',
  'article_15',
  'article_16',
  'article_17',
  'article_18',
  'article_19',
  'article_20',
  'article_21',
  'article_22',
  'article_23',
] as const;

export type IapPollPriceIdsType = (typeof IapPollPriceIdsList)[number];

export type IapPollOptionType = { priceId: string; points: number };
export type IapPollType = {
  _id: string;
  appId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  options: IapPollOptionType[];

  displayResults: boolean;
  active: boolean;

  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
};
