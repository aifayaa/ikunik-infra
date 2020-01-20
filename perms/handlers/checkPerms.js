import { checkPerms } from '../../libs/perms/checkPerms';

export default ({ required, perms }) => checkPerms(required, perms);
