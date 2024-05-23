export type AppsPermType =
  | 'owner'
  | 'admin'
  | 'editor'
  | 'moderator'
  | 'viewer';

export type AppsPermWithoutOwnerType =
  | 'admin'
  | 'editor'
  | 'moderator'
  | 'viewer';

export type OrganizationPermType = 'owner' | 'admin' | 'member';
