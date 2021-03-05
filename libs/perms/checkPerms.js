/**
 * Check perms object which should contains required perms
 *
 * @params  {Array|string} required The Array of required permission,
 *                         use an Array of Array to required multiple permission
 *                         ex: [[perm1, perm2], perm3], will return true if user has
 *                         perm1 + perm2, or if user has only perm3
 *
 * @params  {object | stringified object} perms User perms
 *
 * @return  {boolean}  indicate if all permissions have been granted according
 *                     to supplied perms param.
*/

export const checkPerms = (required, perms) => {
  if (typeof perms === 'string') {
    perms = JSON.parse(perms);
  }
  if (!Object.keys(perms).length) return false;
  if (!Array.isArray(required)) required = [required];

  return !required.every((val) => {
    if (!Array.isArray(val)) {
      val = [val];
    }
    return !val.reduce((acc, curr) => {
      if (!acc) return acc;
      return !!perms[curr];
    }, true);
  });
};
