/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  PANIC_CODE,
} from '../../../../libs/httpResponses/errorCodes.ts';

export class AbstractTarget {
  /**
   * should perform the necessary operations for an accepted invitation
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async handleInvitationAccepted({ session, invitedUser }) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.handleInvitationAccepted()' directly`
    );
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars, require-await
  async checkUserCanCreate(user) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.checkUserCanCreate()' directly`
    );
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars, require-await
  async checkUserCanAccept(user) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.checkUserCanAccept()' directly`
    );
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars, require-await
  async checkUserCanDecline(user) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.checkUserCanDecline()' directly`
    );
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars, require-await
  async checkUserCanCancel(user) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.checkUserCanCancel()' directly`
    );
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars, require-await
  async checkUserCanResend(user) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.checkUserCanResend()' directly`
    );
  }

  /**
   * should return query parameters to find an existing invitation
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  getFindInvitationQuery() {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.getFindInvitationQuery()' directly`
    );
  }

  /**
   * should return properties that will be added to the target in the invitation document
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async getInvitationDocumentProperties() {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.getInvitationDocumentProperties()' directly`
    );
  }

  /**
   * should return the translated title that will be used for the notification emitted
   * after an invitation has been created
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async getCreatedInvitationNotificationTitle(locale) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.getCreatedInvitationNotificationTitle()' directly`
    );
  }

  /**
   * should return the translated title that will be used for the notification emitted
   * after an invitation has been updated (accepted/declined/canceled)
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async getUpdatedInvitationNotificationTitle(locale, translatedStatus) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.getUpdatedInvitationNotificationTitle()' directly`
    );
  }

  /**
   * should return the template used for the notification emitted
   * after an invitation has been created
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  getCreatedInvitationNotificationTemplateName(locale) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.getCreatedInvitationNotificationTemplateName()' directly`
    );
  }

  /**
   * should return the template used for the notification emitted
   * after an invitation has been updated (accepted/declined/canceled)
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  getUpdatedInvitationNotificationTemplateName(locale) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.getUpdatedInvitationNotificationTemplateName()' directly`
    );
  }

  /**
   * should return the template parameters used for the notification emitted
   * after an invitation has been created
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async getCreatedInvitationNotificationTemplateParameters(locale) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.getCreatedInvitationNotificationTemplateParameters()' directly`
    );
  }

  /**
   * should return the template parameters used for the notification emitted
   * after an invitation has been updated (accepted/declined/canceled)
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this
  async getUpdatedInvitationNotificationTemplateParameters(locale) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractTarget.getUpdatedInvitationNotificationTemplateParameters()' directly`
    );
  }

  /**
   * should initialize the target, if necessary
   */
  // eslint-disable-next-line no-unused-vars, require-await, class-methods-use-this, no-empty-function
  async init({ invitedUser, invitingUser }) {}
}
