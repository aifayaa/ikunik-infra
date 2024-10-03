type CrowdViewType = 'user' | 'device' | 'userDevice';

export type CrowdSearchPipelineFiltersType = {
  articleId?: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  search?: string;
  email?: string;
  badgeId?: string;
  type?: CrowdViewType[];
  userId?: string[];
  deviceId?: string[];

  requires?: 'geolocation';

  lat?: number;
  lng?: number;
  radius?: number;

  sortBy?: 'readingTime' | 'firstMetricAt' | 'distance' | 'lastMetricAt';
  sortOrder?: 'asc' | 'desc';
};

export type CrowdSearchParamsType = {
  articleId?: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  search?: string;
  email?: string;
  badgeId?: string;
  type?: CrowdViewType[];
  userId?: string[];
  deviceId?: string[];

  lat?: number;
  lng?: number;
  radius?: number;

  limit?: number;
  skip?: number;

  sortBy?: 'readingTime' | 'firstMetricAt' | 'distance' | 'lastMetricAt';
  sortOrder?: 'asc' | 'desc';
};

export type CrowdSearchGeoJSONParamsType = {
  articleId?: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  search?: string;
  email?: string;
  badgeId?: string;
  type?: CrowdViewType[];
  userId?: string[];
  deviceId?: string[];

  lat?: number;
  lng?: number;
  radius?: number;

  limit?: number;
  skip?: number;

  sortBy?: 'readingTime' | 'firstMetricAt' | 'distance' | 'lastMetricAt';
  sortOrder?: 'asc' | 'desc';
};

export type CrowdLastGeoJSONParamsType = {
  from: Date;
  all: boolean;
};

export type UserMetricReturnedDeviceType = {
  deviceId: string;
  firstMetricAt: Date;
  lastMetricAt: Date;
  location?: [number, number];
};

export type UserMetricLocationType = {
  _id: string;
  appId: string;
  contentCollection: string;
  contentId: string;
  createdAt: Date;
  deviceId: string;
  modifiedAt: boolean;
  trashed: boolean;
  type: 'geolocation';
  userId: string | null;
  location: [number, number];
};

export type UserMetricTimeType = {
  _id: string;
  appId: string;
  contentCollection: string;
  contentId: string;
  createdAt: Date;
  deviceId: string;
  modifiedAt: boolean;
  trashed: boolean;
  type: 'time';
  userId: string | null;
  startTime: Date;
  endTime: Date;
  time: number;
};
