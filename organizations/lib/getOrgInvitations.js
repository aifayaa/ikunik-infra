/* eslint-disable import/no-relative-packages */
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

  try {
    const items = await client
      .db()
      .collection(COLL_INVITATIONS)
      .find({ 'target.organizationId': orgId }, findOptions)
      .toArray();

    const totalCount = await client
      .db()
      .collection(COLL_INVITATIONS)
      .countDocuments({ 'target.organizationId': orgId });
    return {
      totalCount,
      items,
    };
  } finally {
    client.close();
  }
};
