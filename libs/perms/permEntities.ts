export type AppsPermType =
  | 'owner'
  | 'admin'
  | 'editor'
  | 'moderator'
  | 'viewer';

export const appsFeaturePermsList = [
  'ticketingScanner',
  'articlesEditor',
  'appLiveStreaming',
] as const;

export type AppsFeaturePermType = (typeof appsFeaturePermsList)[number];

export type AppsPermWithoutOwnerType = Omit<AppsPermType, 'owner'>;

export type OrganizationPermType = 'owner' | 'admin' | 'member';

// The lower ranking, the higher role privilege
export const OrganizationPermRanking: OrganizationPermType[] = [
  'owner',
  'admin',
  'member',
];
