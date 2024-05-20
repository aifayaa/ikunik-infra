/* eslint-disable import/no-relative-packages */
import { objUnset } from '../../libs/utils';

export const userPrivateFields = ['services', 'perms', 'superAdmin'];

export function filterUserPrivateFields(app) {
  // Deep duplication required to avoid modifying the source
  const ret = JSON.parse(JSON.stringify(app));

  userPrivateFields.forEach((field) => {
    objUnset(ret, field);
  });

  return ret;
}
