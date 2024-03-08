// eslint-disable-next-line import/no-relative-packages
import { oldCheckPerms } from '../../libs/perms/oldCheckPerms';

export default ({ required, perms }) => oldCheckPerms(required, perms);
