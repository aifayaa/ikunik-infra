/* eslint-disable import/no-relative-packages */
import { capitalize } from '../../libs/utils';

export const getUserName = (user) => {
  let username = '';
  if (user.profile && user.profile.email) {
    username = user.profile.email;
  }
  if (Array.isArray(user.emails) && user.emails.length > 0) {
    username = user.emails[0].address;
  }
  if (user.profile && user.profile.username) {
    username = user.profile.username;
  }
  if (user.profile && user.profile.firstname && user.profile.lastname) {
    username = `${capitalize(user.profile.firstname)} ${capitalize(user.profile.lastname)}`;
  }

  return username;
};
