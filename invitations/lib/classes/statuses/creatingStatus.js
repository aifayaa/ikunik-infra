/* eslint-disable import/no-relative-packages */
import uuid from 'uuid';
import { AbstractStatus } from './abstractStatus';
import mongoCollections from '../../../../libs/mongoCollections.json';
import { invitationStatuses } from '../../../const/invitations';

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
    if (invitedUser) baseFindInvitationQuery.toUserId = invitedUser._id;

    const queryFromTarget = this.target.getFindInvitationQuery();
    const queryFromMethod = this.method.getFindInvitationQuery();

    if (!queryFromTarget || !queryFromMethod) return;

    const findInvitationQuery = {
      ...baseFindInvitationQuery,
      ...queryFromTarget,
      ...queryFromMethod,
    };

    const existingInvitation = await this.mongoClient
      .db()
      .collection(COLL_INVITATIONS)
      .findOne(findInvitationQuery);

    if (existingInvitation) throw new Error('already_exists');
  }

  // should be protected or private
  async generateInvitationDocument() {
    const invitedUser = await this.getInvitedUser();
    const invitationId = uuid.v4();
    const invitationUrl = AbstractStatus.generateInvitationUrl(
      invitationId,
      this.challengeCode
    );

    const document = {
      _id: invitationId,
      fromUserId: this.fromUserId,
      fromUserLocale: this.fromUserLocale,
      toUserLocale: this.toUserLocale,
      status: invitationStatuses.PENDING,
      createdAt: new Date().toISOString(),
      // should never be returned in the http response
      challengeCode: this.challengeCode,
      target: this.target.getInvitationDocumentProperties(),
      method: this.method.getInvitationDocumentProperties({ invitationUrl }),
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
    if (!invitingUser) throw new Error('invitation_inviting_user_not_found');
    await this.target.checkInvitingUser(invitingUser);

    const invitedUser = await this.getInvitedUser();
    if (invitedUser) {
      if (invitedUser._id === invitingUser._id) {
        throw new Error('invitation_cannot_self_invite');
      }
      this.target.checkInvitedUser(invitedUser);
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
