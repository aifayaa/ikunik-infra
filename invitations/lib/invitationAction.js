/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import { Invitation } from './classes/invitation';

export const invitationAction = async (
  currentUserId,
  invitationId,
  parameters
) => {
  const mongoClient = await MongoClient.connect();

  try {
    const invitation = new Invitation({ mongoClient });
    const modifiedCount = await invitation.execAction(
      currentUserId,
      invitationId,
      parameters
    );

    return modifiedCount;
  } finally {
    mongoClient.close();
  }
};
