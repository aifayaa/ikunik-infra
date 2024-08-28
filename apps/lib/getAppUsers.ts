/* eslint-disable import/no-relative-packages */
import { UserType } from '../../users/lib/userEntity';
import getAppAdmins from './getAppAdmins.js';

export default async (appId: string) => {
  const users = (await getAppAdmins(appId, {
    userProjection: null,
  })) as UserType[];

  return users;
};
