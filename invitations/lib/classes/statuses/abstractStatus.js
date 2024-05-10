/* eslint-disable import/no-relative-packages */
import {
  invitationMethodTypes,
  invitationTargetTypes,
  supportedLocales,
} from '../../../const/invitations';
import { AbstractMethod, EmailMethod, InternalMethod } from '../methods';
import { AbstractTarget, OrganizationTarget } from '../targets';

import mongoCollections from '../../../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export class AbstractStatus {
  constructor({ mongoClient }) {
    this.mongoClient = mongoClient;

    this.fromUserId = null;
    this.fromUserLocale = null;
    this.toUserLocale = null;
    this.expiredAt = null;
    this.method = null;
    this.target = null;
    this.invitedUser = null;
    this.invitingUser = null;
  }

  // should be protected
  async getInvitedUser() {
    if (!this.invitedUser) {
      const query = this.method.getFindOneInvitedUserQuery();
      this.invitedUser = await this.mongoClient
        .db()
        .collection(COLL_USERS)
        .findOne(query);
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

  // should be protected
  async notifyCreated({ locale, invitationId }) {
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

    let url = `https://${process.env.DASHBOARD_V2_DOMAIN}`;
    if (process.env.DASHBOARD_V2_INVITATIONS_PAGE_URL) {
      url = `${process.env.DASHBOARD_V2_INVITATIONS_PAGE_URL}/${invitationId}`;
    }

    await this.method.notifyCreated({
      title,
      template,
      templateParameters,
      invitingUser,
      url,
    });
  }

  async init({
    fromUserId,
    target,
    method,
    fromUserLocale,
    toUserLocale,
    expiredAt,
  }) {
    this.fromUserId = fromUserId;
    this.fromUserLocale = fromUserLocale;
    this.toUserLocale = toUserLocale;
    this.expiredAt = expiredAt;

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
    throw new Error('invitation_unauthorized_action');
  }

  // eslint-disable-next-line require-await, class-methods-use-this
  async accept() {
    throw new Error('invitation_unauthorized_action');
  }

  // eslint-disable-next-line require-await, class-methods-use-this
  async decline() {
    throw new Error('invitation_unauthorized_action');
  }

  // eslint-disable-next-line require-await, class-methods-use-this
  async cancel() {
    throw new Error('invitation_unauthorized_action');
  }

  // eslint-disable-next-line require-await, class-methods-use-this
  async resend() {
    throw new Error('invitation_unauthorized_action');
  }
}
