/* eslint-disable import/no-relative-packages */
import { sendInvitationEmailToAdmin } from '../../sendInvitationEmailToAdmin';
import { getUserName } from '../../../utils/getUserName';
import { invitationMethodTypes } from '../../../const/invitations';
import { AbstractMethod } from './abstractMethod';

const { ADMIN_APP } = process.env;

export class EmailMethod extends AbstractMethod {
  constructor({ toUserEmail }) {
    super();
    this.toUserEmail = toUserEmail;
  }

  // eslint-disable-next-line require-await
  async getInvitationDocumentProperties() {
    return {
      type: invitationMethodTypes.EMAIL,
      emailAddress: this.toUserEmail,
    };
  }

  getFindInvitationQuery() {
    return {
      'method.type': invitationMethodTypes.EMAIL,
      'method.emailAddress': this.toUserEmail,
    };
  }

  getFindOneInvitedUserQuery() {
    return {
      $and: [{ appId: ADMIN_APP }, { 'emails.address': this.toUserEmail }],
    };
  }

  static async sendNotification({
    userEmail,
    title,
    template,
    parameters,
    context,
  }) {
    const result = await sendInvitationEmailToAdmin({
      originalTo: userEmail,
      subject: title,
      template,
      vars: parameters,
      context,
    });
    return result;
  }

  /**
   * notify invited user
   */
  async notifyCreated({
    title,
    template,
    templateParameters,
    invitingUser,
    url,
    invitationId,
    notificationContext,
  }) {
    const invitingUsername = getUserName(invitingUser);

    const parameters = {
      ...templateParameters,
      invitingUsername,
      url,
    };

    const result = await EmailMethod.sendNotification({
      userEmail: this.toUserEmail,
      title,
      template,
      parameters,
      context: {
        notificationType: 'created',
        invitationId,
        ...notificationContext,
      },
    });
    return result;
  }

  /**
   * used for accepted/declined invitations
   *
   * notify inviting user
   */
  async notifyReplied({ title, template, templateParameters, invitingUser }) {
    let invitingUserEmail;

    if (invitingUser.profile && invitingUser.profile.email) {
      invitingUserEmail = invitingUser.profile.email;
    }
    if (Array.isArray(invitingUser.emails) && invitingUser.emails.length > 0) {
      invitingUserEmail = invitingUser.emails[0].address;
    }

    const parameters = {
      ...templateParameters,
      userNameOrEmail: this.toUserEmail,
    };

    const result = await EmailMethod.sendNotification({
      userEmail: invitingUserEmail,
      title,
      template,
      parameters,
      context: {
        notificationType: 'replied',
      },
    });
    return result;
  }

  /**
   * notify invited user
   */
  async notifyCanceled({ title, template, templateParameters, invitingUser }) {
    const invitingUsername = getUserName(invitingUser);

    const parameters = {
      ...templateParameters,
      userNameOrEmail: invitingUsername,
    };

    const result = await EmailMethod.sendNotification({
      userEmail: this.toUserEmail,
      title,
      template,
      parameters,
      context: {
        notificationType: 'canceled',
      },
    });
    return result;
  }

  // eslint-disable-next-line class-methods-use-this, no-empty-function, no-unused-vars
  async init({ invitingUser, invitedUser }) {}
}
