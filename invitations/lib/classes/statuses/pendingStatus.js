/* eslint-disable import/no-relative-packages */
import { AbstractStatus } from './abstractStatus';
import {
  invitationStatuses,
  supportedLocales,
} from '../../../const/invitations';
import { formatMessage, intlInit } from '../../../../libs/intl/intl';
import mongoCollections from '../../../../libs/mongoCollections.json';

const { COLL_INVITATIONS } = mongoCollections;

export class PendingStatus extends AbstractStatus {
  async updateAccepted(invitationId) {
    const session = this.mongoClient.startSession();
    let count = 0;

    try {
      await session.withTransaction(async () => {
        const invitedUser = await this.getInvitedUser();
        if (!invitedUser) throw new Error('invitation_invited_user_not_found');

        const { modifiedCount } = await this.target.handleInvitationAccepted({
          invitedUser,
          session,
        });
        if (modifiedCount === 0) {
          throw new Error('invitation_target_update_failure');
        }

        count += modifiedCount;

        const updateInvitationRes = await this.mongoClient
          .db()
          .collection(COLL_INVITATIONS)
          .updateOne(
            { _id: invitationId },
            {
              $set: {
                toUserId: invitedUser._id,
                status: invitationStatuses.ACCEPTED,
                updatedAt: new Date().toISOString(),
              },
            },
            { session }
          );

        if (updateInvitationRes.modifiedCount === 0) {
          throw new Error('invitation_update_failure');
        }
        count += updateInvitationRes.modifiedCount;
      });
    } finally {
      await session.endSession();
    }

    return count;
  }

  async updateDeclined(invitationId) {
    const invitedUser = await this.getInvitedUser();
    if (!invitedUser) throw new Error('invitation_invited_user_not_found');

    const updateInvitationRes = await this.mongoClient
      .db()
      .collection(COLL_INVITATIONS)
      .updateOne(
        { _id: invitationId },
        {
          $set: {
            status: invitationStatuses.DECLINED,
            toUserId: invitedUser._id,
            updatedAt: new Date().toISOString(),
          },
        }
      );

    if (updateInvitationRes.modifiedCount === 0) {
      throw new Error('invitation_update_failure');
    }

    return updateInvitationRes.modifiedCount;
  }

  async updateCanceled(invitationId) {
    const updateInvitationRes = await this.mongoClient
      .db()
      .collection(COLL_INVITATIONS)
      .updateOne(
        { _id: invitationId },
        {
          $set: {
            status: invitationStatuses.CANCELED,
            updatedAt: new Date().toISOString(),
          },
        }
      );

    if (updateInvitationRes.modifiedCount === 0) {
      throw new Error('invitation_update_failure');
    }

    return updateInvitationRes.modifiedCount;
  }

  /**
   * notify inviting user
   */
  async notifyAccepted() {
    await intlInit(this.fromUserLocale);

    const translatedStatus = formatMessage(
      'invitations:status_accepted_feminine'
    );
    const title = await this.target.getUpdatedInvitationNotificationTitle(
      this.fromUserLocale,
      translatedStatus
    );
    const template = this.target.getUpdatedInvitationNotificationTemplateName(
      this.fromUserLocale
    );
    const templateParameters =
      await this.target.getUpdatedInvitationNotificationTemplateParameters(
        this.fromUserLocale
      );

    const invitingUser = await this.getInvitingUser();

    // invitation has been accepted, notify inviting user
    await this.method.notifyReplied({
      title,
      template,
      templateParameters: {
        ...templateParameters,
        status: translatedStatus,
      },
      invitingUser,
    });
  }

  /**
   * notify inviting user
   */
  async notifyDeclined() {
    await intlInit(this.fromUserLocale);

    const translatedStatus = formatMessage(
      'invitations:status_declined_feminine'
    );
    const title = await this.target.getUpdatedInvitationNotificationTitle(
      this.fromUserLocale,
      translatedStatus
    );
    const template = this.target.getUpdatedInvitationNotificationTemplateName(
      this.fromUserLocale
    );
    const templateParameters =
      await this.target.getUpdatedInvitationNotificationTemplateParameters(
        this.fromUserLocale
      );

    const invitingUser = await this.getInvitingUser();

    await this.method.notifyReplied({
      title,
      template,
      templateParameters: {
        ...templateParameters,
        status: translatedStatus,
      },
      invitingUser,
    });
  }

  /**
   * notify invited user
   */
  async notifyCanceled() {
    if (!Object.values(supportedLocales).includes(this.toUserLocale)) {
      throw new Error('unsupported_locale');
    }
    await intlInit(this.toUserLocale);

    const translatedStatus = formatMessage(
      'invitations:status_canceled_feminine'
    );
    const title = await this.target.getUpdatedInvitationNotificationTitle(
      this.toUserLocale,
      translatedStatus
    );
    const template = this.target.getUpdatedInvitationNotificationTemplateName(
      this.toUserLocale
    );
    const templateParameters =
      await this.target.getUpdatedInvitationNotificationTemplateParameters(
        this.toUserLocale
      );

    const invitingUser = await this.getInvitingUser();

    await this.method.notifyCanceled({
      title,
      template,
      templateParameters: {
        ...templateParameters,
        status: translatedStatus,
      },
      invitingUser,
    });
  }

  /* ****************************************************************************
    Public methods below
  **************************************************************************** */

  /**
   * Only invited user can accept the invitation
   */
  async accept({ invitationId, currentUserId }) {
    const invitedUser = await this.getInvitedUser();
    if (!invitedUser) throw new Error('invitation_invited_user_not_found');

    if (invitedUser._id !== currentUserId) {
      throw new Error('invitation_unauthorized_action');
    }

    this.target.checkInvitedUser(invitedUser);

    const modifiedCount = await this.updateAccepted(invitationId);
    await this.notifyAccepted();

    return modifiedCount;
  }

  /**
   * Only invited user can decline the invitation
   */
  async decline({ invitationId, currentUserId }) {
    const invitedUser = await this.getInvitedUser();
    if (!invitedUser) throw new Error('invitation_invited_user_not_found');

    if (invitedUser._id !== currentUserId) {
      throw new Error('invitation_unauthorized_action');
    }

    this.target.checkInvitedUser(invitedUser);

    const modifiedCount = await this.updateDeclined(invitationId);
    await this.notifyDeclined();

    return modifiedCount;
  }

  /**
   * Only inviting user can cancel the invitation
   */
  async cancel({ invitationId, currentUserId }) {
    const invitingUser = await this.getInvitingUser();
    if (!invitingUser) throw new Error('invitation_inviting_user_not_found');

    if (invitingUser._id !== currentUserId) {
      throw new Error('invitation_unauthorized_action');
    }

    this.target.checkInvitingUser(invitingUser);

    const modifiedCount = await this.updateCanceled(invitationId);
    await this.notifyCanceled();

    return modifiedCount;
  }

  /**
   * Only inviting user can resend the invitation
   */
  async resend({ invitationId, currentUserId }) {
    const invitingUser = await this.getInvitingUser();
    if (!invitingUser) throw new Error('invitation_inviting_user_not_found');

    if (invitingUser._id !== currentUserId) {
      throw new Error('invitation_unauthorized_action');
    }

    await this.notifyCreated({
      locale: this.toUserLocale,
      invitationId,
    });
  }
}
