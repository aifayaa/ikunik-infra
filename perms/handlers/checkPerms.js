import checkPerms from '../../libs/perms/checkPerms';

export default ({ required, perms }, context, cb) => {
  cb(null, checkPerms(required, perms));
};
