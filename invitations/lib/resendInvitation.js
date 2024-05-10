/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import { Invitation } from './classes/invitation';

export const resendInvitation = async (currentUserId, invitationId) => {
  const mongoClient = await MongoClient.connect();

  try {
    const invitation = new Invitation({ mongoClient });
    await invitation.resend(currentUserId, invitationId);
  } finally {
    mongoClient.close();
  }
};
