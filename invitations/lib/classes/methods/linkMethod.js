/* eslint-disable import/no-relative-packages */
import { AbstractMethod } from './abstractMethod';
import { invitationMethodTypes } from '../../../const/invitations';

export class LinkMethod extends AbstractMethod {
  // eslint-disable-next-line class-methods-use-this, require-await
  async getInvitationDocumentProperties({ invitationUrl }) {
    return {
      type: invitationMethodTypes.LINK,
      invitationUrl,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  getFindInvitationQuery() {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  getFindOneInvitedUserQuery() {
    return null;
  }

  // eslint-disable-next-line require-await, no-empty-function
  static async sendNotification() {}

  // eslint-disable-next-line class-methods-use-this, no-empty-function
  async notifyCreated() {}

  // eslint-disable-next-line class-methods-use-this, no-empty-function
  async notifyReplied() {}

  // eslint-disable-next-line class-methods-use-this, no-empty-function
  async notifyCanceled() {}

  // eslint-disable-next-line class-methods-use-this, require-await, no-empty-function
  async init() {}
}
