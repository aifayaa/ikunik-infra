export type AppsPermType =
  | 'owner'
  | 'admin'
  | 'editor'
  | 'moderator'
  | 'viewer';

export type AppsFeaturePermType = 'ticketingScanner' | 'articlesEditor';
export const appsFeaturePermsList: AppsFeaturePermType[] = [
  'ticketingScanner',
  'articlesEditor',
];

export type AppsPermWithoutOwnerType = Omit<AppsPermType, 'owner'>;

export type OrganizationPermType = 'owner' | 'admin' | 'member';

// The lower ranking, the higher role privilege
export const OrganizationPermRanking: OrganizationPermType[] = [
  'owner',
  'admin',
  'member',
];
