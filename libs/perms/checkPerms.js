/**
 * Check perms object which should contains required perms
 *
 * @params  {Array|string} required The Array of required permission
 *
 * @params  {object} perms User perms
 *
 * @return  {boolean}  indicate if all permissions have been granted according
 *                     to supplied perms param.
*/

export default (required, perms) => {
  if (!Array.isArray(required)) required = [required];
  return required.reduce((acc, curr) => {
    if (!acc) return acc;
    return !!perms[curr];
  }, true);
};
