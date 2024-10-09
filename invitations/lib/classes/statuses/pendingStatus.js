/* eslint-disable import/no-relative-packages */
import { AbstractStatus } from './abstractStatus';
import {
  invitationStatuses,
  supportedLocales,
} from '../../../const/invitations';
import { formatMessage, intlInit } from '../../../../libs/intl/intl';
import mongoCollections from '../../../../libs/mongoCollections.json';
import { CrowdaaError } from '../../../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_CHALLENGE_CODE_INVITATION_CODE,
  INVALID_LOCALE_CODE,
  INVALID_SELF_INVITATION_CODE,
  UPDATE_FAILURE_CODE,
  USER_NOT_FOUND_CODE,
} from '../../../../libs/httpResponses/errorCodes.ts';

const { COLL_INVITATIONS } = mongoCollections;

export class PendingStatus extends AbstractStatus {
  async updateAccepted(invitationId, userId) {
    const session = this.mongoClient.startSession();
    let count = 0;
    const user = await this.getUser(userId);
    if (!user) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `Cannot found inviting user '${userId}'`
      );
    }

    try {
      await session.withTransaction(async () => {
        const { modifiedCount } = await this.target.handleInvitationAccepted({
          invitedUser: user,
          session,
        });
        if (modifiedCount === 0) {
          throw new CrowdaaError(
            ERROR_TYPE_INTERNAL_EXCEPTION,
            UPDATE_FAILURE_CODE,
            `Cannot update invited target user '${user._id}' in DB`
          );
        }

        count += modifiedCount;

        const updateInvitationRes = await this.mongoClient
          .db()
          .collection(COLL_INVITATIONS)
          .updateOne(
            { _id: invitationId },
            {
              $set: {
                toUserId: user._id,
                status: invitationStatuses.ACCEPTED,
                updatedAt: new Date().toISOString(),
              },
            },
            { session }
          );

        if (updateInvitationRes.modifiedCount === 0) {
          throw new CrowdaaError(
            ERROR_TYPE_INTERNAL_EXCEPTION,
            UPDATE_FAILURE_CODE,
            `Cannot update invitation '${invitationId}' in DB`
          );
        }
        count += updateInvitationRes.modifiedCount;
      });
    } finally {
      await session.endSession();
    }

    return count;
  }

  async updateDeclined(invitationId, userId) {
    const user = await this.getUser(userId);

    const updateInvitationRes = await this.mongoClient
      .db()
      .collection(COLL_INVITATIONS)
      .updateOne(
        { _id: invitationId },
        {
          $set: {
            status: invitationStatuses.DECLINED,
            toUserId: user ? user._id : undefined,
            updatedAt: new Date().toISOString(),
          },
        }
      );

    if (updateInvitationRes.modifiedCount === 0) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        UPDATE_FAILURE_CODE,
        `Cannot update invitation '${invitationId}' in DB`
      );
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
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        UPDATE_FAILURE_CODE,
        `Cannot update invitation '${invitationId}' in DB`
      );
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
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_LOCALE_CODE,
        `Unsupported locale '${this.toUserLocale}'`
      );
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

  async accept({ invitationId, currentUserId, challengeCode }) {
    if (challengeCode !== this.challengeCode) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_CHALLENGE_CODE_INVITATION_CODE,
        `The challenge code '${challengeCode}' is invalid`
      );
    }
    const invitingUser = await this.getInvitingUser();
    if (invitingUser._id === currentUserId) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_SELF_INVITATION_CODE,
        `Inviting user '${invitingUser._id}' cannot accept an invitation from himself`
      );
    }

    const user = await this.getUser(currentUserId);
    await this.target.checkUserCanAccept(user);

    const modifiedCount = await this.updateAccepted(
      invitationId,
      currentUserId
    );
    await this.notifyAccepted();

    return modifiedCount;
  }

  async decline({ invitationId, currentUserId, challengeCode }) {
    if (challengeCode !== this.challengeCode) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_CHALLENGE_CODE_INVITATION_CODE,
        `The challenge code '${challengeCode}' is invalid`
      );
    }

    const modifiedCount = await this.updateDeclined(
      invitationId,
      currentUserId
    );
    await this.notifyDeclined();

    return modifiedCount;
  }

  async cancel({ invitationId, currentUserId }) {
    const invitingUser = await this.getInvitingUser();

    if (invitingUser && invitingUser._id === currentUserId) {
      await this.target.checkUserCanCancel(invitingUser);
    } else {
      const currentUser = await this.getUser(currentUserId);
      await this.target.checkUserCanCancel(currentUser);
    }

    const modifiedCount = await this.updateCanceled(invitationId);
    await this.notifyCanceled();

    return modifiedCount;
  }

  async resend({ invitationId, currentUserId }) {
    const invitingUser = await this.getInvitingUser();

    if (invitingUser && invitingUser._id === currentUserId) {
      await this.target.checkUserCanResend(invitingUser);
    } else {
      const currentUser = await this.getUser(currentUserId);
      await this.target.checkUserCanResend(currentUser);
    }

    await this.notifyCreated({
      locale: this.toUserLocale,
      invitationId,
      challengeCode: this.challengeCode,
    });
  }
}
