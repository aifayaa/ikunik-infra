/* eslint-disable import/no-relative-packages */
import {
  invitationMethodTypes,
  invitationTargetTypes,
  supportedLocales,
} from '../../../const/invitations';
import {
  AbstractMethod,
  EmailMethod,
  InternalMethod,
  LinkMethod,
} from '../methods';
import { AbstractTarget, OrganizationTarget } from '../targets';

import mongoCollections from '../../../../libs/mongoCollections.json';
import { CrowdaaError } from '../../../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_EXPIRATION_DATA_INVITATION_CODE,
  INVALID_LOCALE_CODE,
  MISSING_ARGUMENT_CODE,
  PANIC_CODE,
} from '../../../../libs/httpResponses/errorCodes.ts';

const { COLL_INVITATIONS, COLL_USERS } = mongoCollections;

const getAppRegion = () => {
  const { CROWDAA_REGION, STAGE } = process.env;

  if (['dev', 'preprod'].includes(STAGE)) {
    return `${STAGE}-${CROWDAA_REGION}`;
  }

  if (STAGE === 'prod') {
    return `${CROWDAA_REGION}`;
  }

  return undefined;
};

export class AbstractStatus {
  constructor({ mongoClient }) {
    this.mongoClient = mongoClient;

    this.fromUserId = null;
    this.toUserId = null;
    this.fromUserLocale = null;
    this.toUserLocale = null;
    this.expiredAt = null;
    this.method = null;
    this.target = null;
    this.challengeCode = null;
    this.invitedUser = null;
    this.invitingUser = null;
    this.currentUser = null;
  }

  // should be protected
  async getUser(userId) {
    const user = await this.mongoClient
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId });

    return user;
  }

  // should be protected
  async getInvitedUser() {
    if (!this.invitedUser) {
      let query;

      if (this.toUserId) {
        query = { _id: this.toUserId };
      } else {
        query = this.method.getFindOneInvitedUserQuery();
      }

      if (query) {
        this.invitedUser = await this.mongoClient
          .db()
          .collection(COLL_USERS)
          .findOne(query);
      }
    }

    return this.invitedUser;
  }

  // should be protected
  async getInvitingUser() {
    if (!this.invitingUser) {
      this.invitingUser = await this.mongoClient
        .db()
        .collection(COLL_USERS)
        .findOne({
          _id: this.fromUserId,
        });
    }

    return this.invitingUser;
  }

  static generateInvitationUrl(invitationId, challengeCode) {
    return `https://${process.env.DASHBOARD_V2_DOMAIN}/${getAppRegion()}/invitations/${invitationId}?challengeCode=${challengeCode}&utm_source=invitation`;
  }

  async recordCreatedInvitationEmailSuccess({
    invitationId,
    notificationResult,
    target,
    template,
  }) {
    if (
      !invitationId ||
      !notificationResult ||
      notificationResult.status !== 'redirected_to_admin'
    ) {
      return;
    }

    await this.mongoClient
      .db()
      .collection(COLL_INVITATIONS)
      .updateOne(
        { _id: invitationId },
        {
          $set: {
            'notification.email': {
              status: 'redirected_to_admin',
              provider: notificationResult.provider,
              redirectTo: notificationResult.redirectTo,
              originalTo: notificationResult.originalTo,
              sentAt: notificationResult.sentAt,
              messageId: notificationResult.messageId,
              template,
              targetType: target && target.type,
              organizationId: target && target.organizationId,
              role: target && target.role,
            },
          },
        }
      );
  }

  async recordCreatedInvitationEmailFailure({
    invitationId,
    error,
    target,
    template,
  }) {
    if (!invitationId) {
      return;
    }

    try {
      await this.mongoClient
        .db()
        .collection(COLL_INVITATIONS)
        .updateOne(
          { _id: invitationId },
          {
            $set: {
              'notification.email': {
                status: 'failed',
                provider: 'ses',
                redirectTo: process.env.EMAIL_SANDBOX_REDIRECT_TO,
                originalTo: this.method && this.method.toUserEmail,
                failedAt: new Date().toISOString(),
                template,
                targetType: target && target.type,
                organizationId: target && target.organizationId,
                role: target && target.role,
                errorCode:
                  error && (error.code || error.statusCode || error.name),
                errorMessage: error && error.message,
              },
            },
          }
        );
    } catch (updateError) {
      // eslint-disable-next-line no-console
      console.error(
        JSON.stringify({
          event: 'invitation_email_failure_trace_update_failed',
          invitationId,
          errorCode:
            updateError &&
            (updateError.code || updateError.statusCode || updateError.name),
          errorMessage: updateError && updateError.message,
        })
      );
    }
  }

  // should be protected
  async notifyCreated({ locale, invitationId, challengeCode }) {
    if (!Object.values(supportedLocales).includes(locale)) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_LOCALE_CODE,
        `Unsupported locale '${locale}'`
      );
    }
    const title =
      await this.target.getCreatedInvitationNotificationTitle(locale);
    const template =
      this.target.getCreatedInvitationNotificationTemplateName(locale);
    const templateParameters =
      await this.target.getCreatedInvitationNotificationTemplateParameters(
        locale
      );
    const target = await this.target.getInvitationDocumentProperties();

    const invitingUser = await this.getInvitingUser();

    try {
      const notificationResult = await this.method.notifyCreated({
        title,
        template,
        templateParameters,
        invitingUser,
        url: AbstractStatus.generateInvitationUrl(invitationId, challengeCode),
        invitationId,
        notificationContext: {
          target,
        },
      });

      await this.recordCreatedInvitationEmailSuccess({
        invitationId,
        notificationResult,
        target,
        template,
      });

      return notificationResult;
    } catch (error) {
      await this.recordCreatedInvitationEmailFailure({
        invitationId,
        error,
        target,
        template,
      });
      throw error;
    }
  }

  async init({
    fromUserId,
    toUserId,
    target,
    method,
    fromUserLocale,
    toUserLocale,
    expiredAt,
    challengeCode,
  }) {
    this.fromUserId = fromUserId;
    this.toUserId = toUserId;
    this.fromUserLocale = fromUserLocale;
    this.toUserLocale = toUserLocale;
    this.expiredAt = expiredAt;
    this.challengeCode = challengeCode;

    if (this.expiredAt && new Date(this.expiredAt) < new Date()) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_EXPIRATION_DATA_INVITATION_CODE,
        `Cannot create an invitation with invalid date '${this.expiredAt}'`
      );
    }

    if (!this.fromUserId) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_ARGUMENT_CODE,
        `Missing argument 'fromUserId'`
      );
    }

    if (!Object.values(supportedLocales).includes(fromUserLocale)) {
      this.fromUserLocale = supportedLocales.EN;
      // TODO log a warning ?
    }

    if (!this.toUserLocale) {
      this.toUserLocale = this.fromUserLocale;
    }

    if (method && method.type === invitationMethodTypes.EMAIL) {
      if (!method.emailAddress) {
        throw new CrowdaaError(
          ERROR_TYPE_VALIDATION_ERROR,
          MISSING_ARGUMENT_CODE,
          `Missing argument 'emailAddress'`
        );
      }

      this.method = new EmailMethod({ toUserEmail: method.emailAddress });
    } else if (method && method.type === invitationMethodTypes.INTERNAL) {
      this.method = new InternalMethod({ toUserId: method.toUserId });
    } else if (method && method.type === invitationMethodTypes.LINK) {
      this.method = new LinkMethod();
    } else {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        PANIC_CODE,
        `Invitation with the method type '${method.type}' is not implemented`
      );
    }

    if (target && target.type === invitationTargetTypes.ORGANIZATION) {
      if (!target.organizationId) {
        throw new CrowdaaError(
          ERROR_TYPE_VALIDATION_ERROR,
          MISSING_ARGUMENT_CODE,
          `Missing argument 'organizationId'`
        );
      }

      this.target = new OrganizationTarget({
        organizationId: target.organizationId,
        role: target.role,
        mongoClient: this.mongoClient,
      });
    } else {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        PANIC_CODE,
        `Invitation with the target type '${target.type}' is not implemented`
      );
    }

    if (!(this.target instanceof AbstractTarget)) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        PANIC_CODE,
        `'target' is not an instance of AbstractTarget '${JSON.stringify(this.target)}'`
      );
    }

    if (!(this.method instanceof AbstractMethod)) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        PANIC_CODE,
        `'method' is not an instance of AbstractMethod '${JSON.stringify(this.method)}'`
      );
    }

    const invitingUser = await this.getInvitingUser();
    const invitedUser = await this.getInvitedUser();

    await this.method.init({ invitingUser, invitedUser });
    await this.target.init({ invitingUser, invitedUser });
  }

  /* ****************************************************************************
    Shared methods below, each one should be reimplemented in the necessary
    states to perform an action
  **************************************************************************** */
  // eslint-disable-next-line require-await, class-methods-use-this
  async create() {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractStatus.create()' directly`
    );
  }

  // eslint-disable-next-line require-await, class-methods-use-this
  async accept() {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractStatus.accept()' directly`
    );
  }

  // eslint-disable-next-line require-await, class-methods-use-this
  async decline() {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractStatus.accept()' directly`
    );
  }

  // eslint-disable-next-line require-await, class-methods-use-this
  async cancel() {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractStatus.accept()' directly`
    );
  }

  // eslint-disable-next-line require-await, class-methods-use-this
  async resend() {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      PANIC_CODE,
      `Cannot use the abstract method 'AbstractStatus.accept()' directly`
    );
  }
}
