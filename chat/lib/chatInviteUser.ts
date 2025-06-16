/* eslint-disable import/no-relative-packages */
import { AppType } from '@apps/lib/appEntity';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  CHAT_CHANNEL_CODE,
  CHAT_NOT_CONFIGURED_CODE,
  CHAT_USER_ALREADY_MEMBER_CODE,
  CHAT_USER_BANNED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_SETUP,
  USER_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import admin, { AppOptions } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

import { getFirebaseApp } from './chatFirebaseUtils';
import {
  ChatChannelType,
  ChatInvitationStatusType,
  ChatInvitationType,
  ChatUserType,
  firebaseCollections,
} from './chatEntities';

const { COLL_APPS, COLL_USERS } = mongoCollections;

type ChatInviteUserParams = {
  fromUserId: string;
  toUserId: string;
  channelId: string;
};

export default async (
  appId: string,
  { fromUserId, toUserId, channelId }: ChatInviteUserParams
) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const app: AppType | null = await db.collection(COLL_APPS).findOne({
      _id: appId,
    });

    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `The app '${appId}' was not found`
      );
    }
    if (!app.credentials || !app.credentials.firebase) {
      throw new CrowdaaError(
        ERROR_TYPE_SETUP,
        CHAT_NOT_CONFIGURED_CODE,
        `The app '${appId}' is not configured`
      );
    }

    const fromUser = await db.collection(COLL_USERS).findOne({
      _id: fromUserId,
      appId,
    });
    const toUser = await db.collection(COLL_USERS).findOne({
      _id: toUserId,
      appId,
    });

    // fromUser should always be defined since fetched & checked at the authorizer step
    if (!fromUser || !toUser) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `The user '${(!fromUser && fromUserId) || toUserId}' was not found`
      );
    }

    const firebaseApp = getFirebaseApp(app);

    const fsdb = getFirestore(firebaseApp);

    // Always ensure the user we are handling is created & up to date
    const chatUserData: ChatUserType = {
      updatedAt: new Date(),
      profile: toUser.profile,
    };
    await fsdb
      .collection(firebaseCollections.COLL_USERS)
      .doc(toUserId)
      .set(chatUserData);

    const channelRef = await fsdb
      .collection(firebaseCollections.COLL_CHANNELS)
      .doc(channelId)
      .get();

    const channelData = channelRef.data() as ChatChannelType | null;
    if (!channelRef.exists || !channelData) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        CHAT_CHANNEL_CODE,
        `The chat channel '${channelId}' was not found`
      );
    }

    const isMember =
      channelData.isPublic || channelData.members.indexOf(toUserId) >= 0;
    const isBanned = channelData.bannedUsers.indexOf(toUserId) >= 0;

    if (isBanned) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        CHAT_USER_BANNED_CODE,
        `The user '${toUserId}' was banned from the channel ${channelId}`
      );
    }

    if (isMember) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        CHAT_USER_ALREADY_MEMBER_CODE,
        `The user '${toUserId}' is already a member of channel ${channelId}`
      );
    }

    const collInvitationsRef = fsdb.collection(
      firebaseCollections.COLL_INVITATIONS
    );
    const invitationsSnapshot = await collInvitationsRef
      .where('toUser.id', '==', toUserId)
      .where('channel.id', '==', channelId)
      .where('status', '==', 'pending')
      .get();
    if (!invitationsSnapshot.empty) {
      let pendingInvitationIds: Array<string> = [];
      let toDisableInvitationIds: Array<string> = [];

      invitationsSnapshot.forEach((doc) => {
        const invitationData = doc.data() as ChatInvitationType;
        if (invitationData.fromUser.id === fromUserId) {
          pendingInvitationIds.push(doc.id);
        } else {
          toDisableInvitationIds.push(doc.id);
        }
      });

      if (pendingInvitationIds.length > 0) {
        const invitationUpdate: Omit<
          ChatInvitationType,
          'createdAt' | 'status'
        > = {
          fromUser: {
            id: fromUser._id,
            profile: fromUser.profile,
          },
          toUser: {
            id: toUser._id,
            profile: toUser.profile,
          },
          channel: {
            id: channelId,
            name: channelData.name,
          },
          updatedAt: new Date(),
        };
        const promises = pendingInvitationIds.map(async (id) => {
          await collInvitationsRef.doc(id).set(
            invitationUpdate,
            // Just update the invitation data, not it's status
            { merge: true }
          );
        });

        await Promise.all(promises);
      }

      if (toDisableInvitationIds.length > 0) {
        const promises = pendingInvitationIds.map(async (id) => {
          const update: { status: ChatInvitationStatusType } = {
            status: 'disabled',
          };
          await collInvitationsRef.doc(id).set(
            update,
            // Just update the invitation data, not it's status
            { merge: true }
          );
        });

        await Promise.all(promises);
      }

      if (pendingInvitationIds.length > 0) {
        return { invited: false };
      }
    }

    const invitationData: ChatInvitationType = {
      fromUser: {
        id: fromUser._id,
        profile: fromUser.profile,
      },
      toUser: {
        id: toUser._id,
        profile: toUser.profile,
      },
      channel: {
        id: channelId,
        name: channelData.name,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
    };
    await collInvitationsRef.add(invitationData);

    return { invited: true };
  } finally {
    client.close();
  }
};
