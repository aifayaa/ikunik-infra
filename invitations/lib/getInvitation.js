/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import { Invitation } from './classes/invitation';

export const getInvitation = async (currentUserId, invitationId) => {
  const mongoClient = await MongoClient.connect();

  try {
    const invitation = new Invitation({ mongoClient });
    const invitationDocument = await invitation.get(
      currentUserId,
      invitationId
    );

    return invitationDocument;
  } finally {
    mongoClient.close();
  }
};
