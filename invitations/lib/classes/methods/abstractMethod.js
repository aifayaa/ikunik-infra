export class AbstractMethod {
  /**
   * should return properties that will be added to the method in the invitation document
   */
  // eslint-disable-next-line class-methods-use-this
  getInvitationDocumentProperties() {
    throw new Error('not_implemented');
  }

  /**
   * should return query parameters to find an existing invitation
   */
  // eslint-disable-next-line class-methods-use-this
  getFindInvitationQuery() {
    throw new Error('not_implemented');
  }

  /**
   * should return query parameters to find the invited user
   */
  // eslint-disable-next-line class-methods-use-this
  getFindOneInvitedUserQuery() {
    throw new Error('not_implemented');
  }

  /**
   * should send a notification to the invited user, after an invitation is created
   * by the inviting user
   */
  // eslint-disable-next-line require-await, class-methods-use-this
  async notifyCreated({
    // eslint-disable-next-line no-unused-vars
    title,
    // eslint-disable-next-line no-unused-vars
    template,
    // eslint-disable-next-line no-unused-vars
    templateParameters,
    // eslint-disable-next-line no-unused-vars
    invitingUser,
    // eslint-disable-next-line no-unused-vars
    url,
  }) {
    throw new Error('not_implemented');
  }

  /**
   * should send a notification to the inviting user, after an invitation is accepted
   * or declined by the invited user
   */
  // eslint-disable-next-line class-methods-use-this, require-await, no-unused-vars
  async notifyReplied({ title, template, templateParameters, invitingUser }) {
    throw new Error('not_implemented');
  }

  /**
   * should send a notification to the invited user, after an invitation is canceled by the
   * inviting user
   */
  // eslint-disable-next-line class-methods-use-this, require-await, no-unused-vars
  async notifyCanceled({ title, template, templateParameters, invitingUser }) {
    throw new Error('not_implemented');
  }

  /**
   * should initialize the method, if necessary
   */
  // eslint-disable-next-line class-methods-use-this, require-await, no-unused-vars, no-empty-function
  async init({ invitingUser, invitedUser }) {}
}
