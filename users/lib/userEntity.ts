import {
  AppsPermType,
  OrganizationPermType,
} from '../../libs/perms/permEntities';

export type UserProfileType = {
  username: string | number;
  avatar?: string;
  avatarId?: string;
  email?: string;
  phone?: string;
  isSuperAdmin?: boolean;
  isUserPicture?: boolean;
  profileIsSetup?: boolean;
  role?: string;
  'terms-of-service'?: boolean;
  id?: string;
  first_name?: string;
  last_name?: string;
  firstname?: string;
  lastname?: string;
  city?: string;
  quality?: string;
  job?: string;
  enseigne?: string;
  company?: string;
  fonction?: string;
  site?: string;
  companyOther?: string;
  supra?: number | string;
  uniquecsoecid?: string;
  isExpert?: boolean;
  qrcodeImage?: string;
  qrcodeImageId?: string;
  phoneNumber?: string;
  affiliateCode?: string;
};

export type UTMType = {
  campaign?: string;
  medium?: string;
  source?: string;
  term?: string;
  content?: string;
};

export type UserType = {
  _id: string;
  services: {
    password?: {
      bcrypt: string;
    };
  };
  emails: [{ address: string }];
  superAdmin?: boolean;
  profile: UserProfileType;
  perms?: {
    apps?: Array<{ _id: string; roles: Array<AppsPermType> }>;
    organizations?: Array<{ _id: string; roles: Array<OrganizationPermType> }>;
  };
};
