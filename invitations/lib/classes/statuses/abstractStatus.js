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
  PANIC_CODE,
} from '../../../../libs/httpResponses/errorCodes.ts';

const { COLL_USERS } = mongoCollections;

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

  // should be protected
  async notifyCreated({ locale, invitationId, challengeCode }) {
    if (!Object.values(supportedLocales).includes(locale)) {
      throw new Error('unsupported_locale');
    }
    const title =
      await this.target.getCreatedInvitationNotificationTitle(locale);
    const template =
      this.target.getCreatedInvitationNotificationTemplateName(locale);
    const templateParameters =
      await this.target.getCreatedInvitationNotificationTemplateParameters(
        locale
      );

    const invitingUser = await this.getInvitingUser();

    await this.method.notifyCreated({
      title,
      template,
      templateParameters,
      invitingUser,
      url: AbstractStatus.generateInvitationUrl(invitationId, challengeCode),
    });
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
      throw new Error('invitation_expired');
    }

    if (!this.fromUserId) {
      throw new Error('missing_argument');
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
        throw new Error('missing_argument');
      }

      this.method = new EmailMethod({ toUserEmail: method.emailAddress });
    } else if (method && method.type === invitationMethodTypes.INTERNAL) {
      this.method = new InternalMethod({ toUserId: method.toUserId });
    } else if (method && method.type === invitationMethodTypes.LINK) {
      this.method = new LinkMethod();
    } else {
      throw new Error('invitation_method_type_not_implemented');
    }

    if (target && target.type === invitationTargetTypes.ORGANIZATION) {
      if (!target.organizationId) {
        throw new Error('missing_argument');
      }

      this.target = new OrganizationTarget({
        organizationId: target.organizationId,
        role: target.role,
        mongoClient: this.mongoClient,
      });
    } else {
      throw new Error('invitation_target_type_not_implemented');
    }

    if (!(this.target instanceof AbstractTarget)) {
      throw new Error('invitation_bad_target_instance');
    }

    if (!(this.method instanceof AbstractMethod)) {
      throw new Error('invitation_bad_method_instance');
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
