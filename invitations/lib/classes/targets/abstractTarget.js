export class AbstractTarget {
  /**
   * should perform the necessary operations for an accepted invitation
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async handleInvitationAccepted({ session, invitedUser }) {
    throw new Error('not_implemented');
  }

  /**
   * should determine if the invited user has already been invited for this target
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  checkInvitedUser(invitedUser) {
    throw new Error('not_implemented');
  }

  /**
   * should determine if the inviting user can actually perform invitation operations
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async checkInvitingUser(invitingUser) {
    throw new Error('not_implemented');
  }

  /**
   * should return query parameters to find an existing invitation
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  getFindInvitationQuery() {
    throw new Error('not_implemented');
  }

  /**
   * should return properties that will be added to the target in the invitation document
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  getInvitationDocumentProperties() {
    throw new Error('not_implemented');
  }

  /**
   * should return the translated title that will be used for the notification emitted
   * after an invitation has been created
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async getCreatedInvitationNotificationTitle(locale) {
    throw new Error('not_implemented');
  }

  /**
   * should return the translated title that will be used for the notification emitted
   * after an invitation has been updated (accepted/declined/canceled)
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async getUpdatedInvitationNotificationTitle(locale, translatedStatus) {
    throw new Error('not_implemented');
  }

  /**
   * should return the template used for the notification emitted
   * after an invitation has been created
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  getCreatedInvitationNotificationTemplateName(locale) {
    throw new Error('not_implemented');
  }

  /**
   * should return the template used for the notification emitted
   * after an invitation has been updated (accepted/declined/canceled)
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  getUpdatedInvitationNotificationTemplateName(locale) {
    throw new Error('not_implemented');
  }

  /**
   * should return the template parameters used for the notification emitted
   * after an invitation has been created
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async getCreatedInvitationNotificationTemplateParameters(locale) {
    throw new Error('not_implemented');
  }

  /**
   * should return the template parameters used for the notification emitted
   * after an invitation has been updated (accepted/declined/canceled)
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async getUpdatedInvitationNotificationTemplateParameters(locale) {
    throw new Error('not_implemented');
  }

  /**
   * should initialize the target, if necessary
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this, no-empty-function
  async init({ invitedUser, invitingUser }) {}
}
