/* eslint-disable import/no-relative-packages */
import { invitationStatuses } from '../../invitations/const/invitations';
import { invitationPrivateFieldsProjection } from '../../invitations/utils/invitationPrivateFieldsProjection';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_INVITATIONS } = mongoCollections;

export default async (orgId, options) => {
  const client = await MongoClient.connect();
  const findOptions = {
    skip: options ? options.start : undefined,
    limit: options ? options.limit : undefined,
    sort: {
      // TODO: client should be able to specify sort
      // TODO: add an index on createdAt
      createdAt: -1,
    },
    projection: invitationPrivateFieldsProjection,
  };

  const filter = {
    'target.organizationId': orgId,
    status: {
      $ne: invitationStatuses.CANCELED,
    },
  };

  try {
    const items = await client
      .db()
      .collection(COLL_INVITATIONS)
      .find(filter, findOptions)
      .toArray();

    const totalCount = await client
      .db()
      .collection(COLL_INVITATIONS)
      .countDocuments(filter);
    return {
      totalCount,
      items,
    };
  } finally {
    client.close();
  }
};
