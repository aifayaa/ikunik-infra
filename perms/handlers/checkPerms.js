// eslint-disable-next-line import/no-relative-packages
import { checkPerms } from '../../libs/perms/checkPerms';

export default ({ required, perms }) => checkPerms(required, perms);
