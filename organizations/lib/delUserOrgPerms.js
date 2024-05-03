/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (userId, orgId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const user = await db
      .collection(COLL_USERS)
      .findOne({ _id: userId, 'perms.organizations._id': orgId });

    // If the target user is not found, Error
    if (!user) {
      throw new Error('user_not_found');
    }

    const userOrganizationPerms = user.perms.organizations.find(
      (org) => org._id === orgId
    );

    // If the target user is the owner, don't delete him
    if (userOrganizationPerms) {
      const userRoles = userOrganizationPerms.roles;

      if (userRoles.includes('owner')) {
        /* TODO Retourner une erreur spécifique, code 200, `data` vide.
         * type: forbidden, code: cannot delete owner */
        return { userDeleted: false };
      }
    }

    const commandRes = await db
      .collection(COLL_USERS)
      .updateOne(
        { _id: userId },
        { $pull: { 'perms.organizations': { _id: orgId } } }
      );

    /* TODO Virer ce check. */
    if (commandRes && commandRes.nModified && commandRes.nModified.ok !== 1) {
      return { userDeleted: false };
    }

    /* TODO Retourner l'utilisateur (l'objet qui a été muté) (filtré, cf. liste des users) */
    return { userDeleted: true };
  } finally {
    client.close();
  }
};
