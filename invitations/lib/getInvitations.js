/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import { Invitation } from './classes/invitation';

export const getInvitations = async (currentUserId, options) => {
  const mongoClient = await MongoClient.connect();

  try {
    const invitation = new Invitation({ mongoClient });
    const invitationDocuments = await invitation.getAll(
      currentUserId,
      options.getAllOptions
    );
    const invitationDocumentsCount =
      await invitation.getTotalCount(currentUserId);

    return {
      totalCount: invitationDocumentsCount,
      items: invitationDocuments,
    };
  } finally {
    mongoClient.close();
  }
};
