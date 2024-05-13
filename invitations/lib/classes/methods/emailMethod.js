/* eslint-disable import/no-relative-packages */
import { sendEmailMailgunTemplate } from '../../../../libs/email/sendEmailMailgun';
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

  static async sendNotification({ userEmail, title, template, parameters }) {
    if (process.env.STAGE === 'dev') {
      // eslint-disable-next-line no-console
      console.log('**** DEV environment: email sending disabled ****');
      // eslint-disable-next-line no-console
      console.log('Send email to: ', userEmail);
      // eslint-disable-next-line no-console
      console.log('Email title: ', title);
      // eslint-disable-next-line no-console
      console.log('Email template: ', template);
      // eslint-disable-next-line no-console
      console.log('Email parameters: ', parameters);
      return;
    }

    await sendEmailMailgunTemplate(
      'No reply <support@crowdaa.com>',
      userEmail,
      title,
      template,
      parameters
    );
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
  }) {
    const invitingUsername = getUserName(invitingUser);

    const parameters = {
      ...templateParameters,
      invitingUsername,
      url,
    };

    await EmailMethod.sendNotification({
      userEmail: this.toUserEmail,
      title,
      template,
      parameters,
    });
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

    await EmailMethod.sendNotification({
      userEmail: invitingUserEmail,
      title,
      template,
      parameters,
    });
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

    await EmailMethod.sendNotification({
      userEmail: this.toUserEmail,
      title,
      template,
      parameters,
    });
  }

  // eslint-disable-next-line class-methods-use-this, no-empty-function, no-unused-vars
  async init({ invitingUser, invitedUser }) {}
}
