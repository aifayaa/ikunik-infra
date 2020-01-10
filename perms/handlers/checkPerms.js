import { checkPerms } from '../../libs/perms/checkPerms';

export default ({ required, perms }) => {
  return checkPerms(required, perms);
};
