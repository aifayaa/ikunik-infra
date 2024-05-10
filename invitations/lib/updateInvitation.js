/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import { Invitation } from './classes/invitation';

export const updateInvitation = async (currentUserId, invitationId, update) => {
  const mongoClient = await MongoClient.connect();

  try {
    const invitation = new Invitation({ mongoClient });
    const modifiedCount = await invitation.update(
      currentUserId,
      invitationId,
      update
    );

    return modifiedCount;
  } finally {
    mongoClient.close();
  }
};
