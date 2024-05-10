/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import { Invitation } from './classes/invitation';

/**
 * created invitation document structure
 * @example
 *  {
 *   _id: string;
 *  fromUserId: string;
 *  toUserId?: string;
 *  fromUserLocale: 'fr' | 'en'
 *  toUserLocale: 'fr' | 'en'
 *  status: 'pending' | 'accepted' | 'declined' | 'canceled';
 *  expiredAt?: string;
 *  createdAt: string;
 *  updatedAt?: string;
 *  target: {
 *    type: 'organization';
 *    organizationId: string;
 *    role: 'admin' | 'member';
 *  };
 *  method: {
 *    type: 'email';
 *    emailAddress: string;
 *  } | {
 *    type: 'internal';
 *    toUserId: string;
 *  };
 *  }
 */
export const createInvitation = async (
  currentUserId,
  invitationParams,
  currentUserLocale
) => {
  const mongoClient = await MongoClient.connect();

  try {
    const invitation = new Invitation({ mongoClient });

    const createdInvitationDocument = await invitation.create(
      currentUserId,
      invitationParams,
      currentUserLocale
    );
    return createdInvitationDocument;
  } finally {
    mongoClient.close();
  }
};
