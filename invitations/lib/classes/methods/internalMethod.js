/* eslint-disable import/no-relative-packages */
import { AbstractMethod } from './abstractMethod';
import { getUserName } from '../../../utils/getUserName';
import { invitationMethodTypes } from '../../../const/invitations';

const { ADMIN_APP } = process.env;

export class InternalMethod extends AbstractMethod {
  constructor({ toUserId }) {
    super();
    this.toUserId = toUserId;
  }

  // eslint-disable-next-line class-methods-use-this
  getInvitationDocumentProperties() {
    return {
      type: invitationMethodTypes.INTERNAL,
      toUserId: this.toUserId,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  getFindInvitationQuery() {
    return {
      'method.type': invitationMethodTypes.INTERNAL,
      'method.toUserId': this.toUserId,
    };
  }

  getFindOneInvitedUserQuery() {
    return {
      $and: [{ appId: ADMIN_APP }, { _id: this.toUserId }],
    };
  }

  // eslint-disable-next-line require-await
  static async sendNotification({ userId, title, template, parameters }) {
    if (process.env.STAGE === 'dev') {
      // eslint-disable-next-line no-console
      console.log('**** DEV environment ****');
      // eslint-disable-next-line no-console
      console.log('Send notification to user with id: ', userId);
      // eslint-disable-next-line no-console
      console.log('Notification title: ', title);
      // eslint-disable-next-line no-console
      console.log('Notification template: ', template);
      // eslint-disable-next-line no-console
      console.log('Notification parameters: ', parameters);
      // TODO return
    }

    // TODO notify invited user with internal notification when available
  }

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

    // notify invited user
    await InternalMethod.sendNotification({
      userId: this.toUserId,
      title,
      template,
      parameters,
    });
  }

  /**
   * used for accepted/declined invitations
   */
  // eslint-disable-next-line class-methods-use-this
  async notifyReplied({ title, template, templateParameters, invitingUser }) {
    const parameters = templateParameters;

    // notify inviting user
    await InternalMethod.sendNotification({
      userId: invitingUser._id,
      title,
      template,
      parameters,
    });
  }

  async notifyCanceled({ title, template, templateParameters, invitingUser }) {
    const invitingUsername = getUserName(invitingUser);

    const parameters = {
      ...templateParameters,
      userNameOrEmail: invitingUsername,
    };

    // notify invited user
    await InternalMethod.sendNotification({
      userId: this.toUserId,
      title,
      template,
      parameters,
    });
  }

  // eslint-disable-next-line class-methods-use-this, require-await, no-unused-vars
  async init({ invitedUser }) {
    if (!invitedUser) {
      // invited user must already exist in case of an internal invitation
      throw new Error('invitation_invited_user_not_found');
    }
  }
}
