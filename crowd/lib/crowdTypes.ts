type CrowdViewType = 'user' | 'device' | 'userDevice';
type OnlyBadgesType = 'assigned' | 'requested' | 'validated' | 'rejected';

export type GeoJSONCoordinatesType = [number, number];

export type CrowdSearchPipelineFiltersType = {
  articleId?: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  search?: string;
  email?: string;
  badgeId?: string;
  type?: CrowdViewType[];
  memberId?: string[];
  notMemberId?: string[];
  deviceId?: string[];
  onlyBadges?: OnlyBadgesType[];

  requires?: 'geolocation';

  lat?: number;
  lng?: number;
  radius?: number;

  geoWithin?: GeoJSONCoordinatesType[];

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
  onlyBadges?: OnlyBadgesType[];

  lat?: number;
  lng?: number;
  radius?: number;

  limit?: number;
  skip?: number;

  geoWithin?: GeoJSONCoordinatesType[];

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
  onlyBadges?: OnlyBadgesType[];

  lat?: number;
  lng?: number;
  radius?: number;

  limit?: number;
  skip?: number;

  geoWithin?: GeoJSONCoordinatesType[];

  sortBy?: 'readingTime' | 'firstMetricAt' | 'distance' | 'lastMetricAt';
  sortOrder?: 'asc' | 'desc';
};

export type CrowdSearchMassUpdateFiltersType = {
  articleId?: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  search?: string;
  email?: string;
  badgeId?: string;
  type?: CrowdViewType[];
  memberId?: string[];
  notMemberId?: string[];
  deviceId?: string[];
  onlyBadges?: OnlyBadgesType[];

  lat?: number;
  lng?: number;
  radius?: number;

  limit?: number;
  skip?: number;

  geoWithin?: GeoJSONCoordinatesType[];

  sortBy?: 'readingTime' | 'firstMetricAt' | 'distance' | 'lastMetricAt';
  sortOrder?: 'asc' | 'desc';
};

export type CrowdSearchMassUpdateNotifyPayloadType = {
  title?: string;
  content?: string;
  extraData?: {
    articleId?: string;
    userArticleId?: string;
    chatRoomId?: string;
    webviewUrl?: string;
    hideNavbar?: boolean;
  };
};

export type CrowdSearchMassUpdateBadgesActionType = 'addBadges' | 'delBadges';
export type CrowdSearchMassUpdateBadgesIdsType = string[];

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
