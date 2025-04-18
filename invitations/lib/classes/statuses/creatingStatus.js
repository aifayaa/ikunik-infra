/* eslint-disable import/no-relative-packages */
import uuid from 'uuid';
import { AbstractStatus } from './abstractStatus';
import mongoCollections from '../../../../libs/mongoCollections.json';
import { invitationStatuses } from '../../../const/invitations';
import { CrowdaaError } from '../../../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_SELF_INVITATION_CODE,
  INVITATION_ALREADY_EXISTS_CODE,
  USER_NOT_FOUND_CODE,
} from '../../../../libs/httpResponses/errorCodes.ts';

const { COLL_INVITATIONS } = mongoCollections;

export class CreatingStatus extends AbstractStatus {
  // should be protected or private
  async checkExistingInvitation() {
    const baseFindInvitationQuery = {
      fromUserId: this.fromUserId,
      /* 
        Add this clause so a user can re invite the same user later in time.
        The target will then determine if the invitation can actually be done again.
      */
      status: invitationStatuses.PENDING,
    };
    const invitedUser = await this.getInvitedUser();
    if (invitedUser) {
      baseFindInvitationQuery.toUserId = invitedUser._id;
    }

    const queryFromTarget = this.target.getFindInvitationQuery();
    const queryFromMethod = this.method.getFindInvitationQuery();

    if (!queryFromTarget || !queryFromMethod) {
      return;
    }

    const findInvitationQuery = {
      ...baseFindInvitationQuery,
      ...queryFromTarget,
      ...queryFromMethod,
      expiredAt: { $gt: new Date() },
    };

    const existingInvitation = await this.mongoClient
      .db()
      .collection(COLL_INVITATIONS)
      .findOne(findInvitationQuery);

    if (existingInvitation) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        INVITATION_ALREADY_EXISTS_CODE,
        `An invitation from user '${this.fromUserId}' to user '${invitedUser && invitedUser._id}' already exists`
      );
    }
  }

  // should be protected or private
  async generateInvitationDocument() {
    const invitedUser = await this.getInvitedUser();
    const invitingUser = await this.getInvitingUser();
    const invitingUserProfile = invitingUser.profile || {};
    const invitationId = uuid.v4();
    const invitationUrl = AbstractStatus.generateInvitationUrl(
      invitationId,
      this.challengeCode
    );
    const target = await this.target.getInvitationDocumentProperties();
    const method = await this.method.getInvitationDocumentProperties({
      invitationUrl,
    });

    const document = {
      _id: invitationId,
      fromUserId: this.fromUserId,
      source: {
        type: 'user',
        _id: invitingUser._id,
        profile: {
          username: invitingUserProfile.username,
          email: invitingUserProfile.email,
          avatar: invitingUserProfile.avatar,
          avatarId: invitingUserProfile.avatarId,
          firstname: invitingUserProfile.firstname,
          lastname: invitingUserProfile.lastname,
        },
      },
      fromUserLocale: this.fromUserLocale,
      toUserLocale: this.toUserLocale,
      status: invitationStatuses.PENDING,
      createdAt: new Date().toISOString(),
      // should never be returned in the http response
      challengeCode: this.challengeCode,
      target,
      method,
    };

    if (this.expiredAt) {
      document.expiredAt = new Date(this.expiredAt).toISOString();
    }

    if (invitedUser) {
      document.toUserId = invitedUser._id;
    }

    return document;
  }

  // should be protected or private
  async insertInDb() {
    const document = await this.generateInvitationDocument();
    await this.mongoClient
      .db()
      .collection(COLL_INVITATIONS)
      .insertOne(document);

    return document;
  }

  /* ****************************************************************************
    Public methods below
  **************************************************************************** */
  async create() {
    await this.checkExistingInvitation();

    const invitingUser = await this.getInvitingUser();
    // inviting user must always exist when creating the invitation
    if (!invitingUser) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `Cannot found inviting user '${this.fromUserId}'`
      );
    }
    await this.target.checkUserCanCreate(invitingUser);

    const invitedUser = await this.getInvitedUser();
    if (invitedUser) {
      if (invitedUser._id === invitingUser._id) {
        throw new CrowdaaError(
          ERROR_TYPE_VALIDATION_ERROR,
          INVALID_SELF_INVITATION_CODE,
          `Inviting user '${invitingUser._id}' cannot send an invitation to himself`
        );
      }
      await this.target.checkUserCanAcceptOrDecline(invitedUser);
    }

    const invitationDocument = await this.insertInDb();
    await this.notifyCreated({
      locale: this.toUserLocale,
      invitationId: invitationDocument._id,
      challengeCode: this.challengeCode,
    });
    return invitationDocument;
  }
}
