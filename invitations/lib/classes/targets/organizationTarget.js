/* eslint-disable import/no-relative-packages */
import { formatMessage, intlInit } from '../../../../libs/intl/intl';
import { capitalize } from '../../../../libs/utils';
import { checkPermsForOrganization } from '../../../../libs/perms/checkPermsFor';
import {
  invitationTargetTypes,
  invitationOrganizationRoles,
  supportedLocales,
} from '../../../const/invitations';
import mongoCollections from '../../../../libs/mongoCollections.json';
import { AbstractTarget } from './abstractTarget';

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

export class OrganizationTarget extends AbstractTarget {
  constructor({ organizationId, role, mongoClient }) {
    super();

    this.role = Object.values(invitationOrganizationRoles).includes(role)
      ? role
      : invitationOrganizationRoles.MEMBER;
    this.mongoClient = mongoClient;
    this.organizationId = organizationId;
    this.organization = null;
  }

  async getOrganization() {
    if (!this.organization) {
      this.organization = await this.mongoClient
        .db()
        .collection(COLL_ORGANIZATIONS)
        .findOne({ _id: this.organizationId });
    }

    return this.organization;
  }

  /**
   * should perform the necessary operations for an accepted invitation
   */
  async handleInvitationAccepted({ session, invitedUser }) {
    this.checkInvitedUser(invitedUser);

    const update = {
      $addToSet: {
        'perms.organizations': {
          _id: this.organizationId,
          roles: [this.role],
        },
      },
    };
    const res = await this.mongoClient
      .db()
      .collection(COLL_USERS)
      .updateOne({ _id: invitedUser._id }, update, { session });

    return { modifiedCount: res.modifiedCount };
  }

  /**
   * should determine if the invited user has already been invited for this target
   */
  checkInvitedUser(invitedUser) {
    if (
      invitedUser &&
      invitedUser.perms &&
      Array.isArray(invitedUser.perms.organizations)
    ) {
      const organizationPerms = invitedUser.perms.organizations.find(
        (orgPerm) => orgPerm._id === this.organizationId
      );

      if (organizationPerms) {
        throw new Error('invitation_user_already_added_to_organization');
      }
    }
  }

  /**
   * should determine if inviting user can actually perform invitation operations
   */
  async checkInvitingUser(invitingUser) {
    if (!invitingUser) throw new Error('invitation_inviting_user_not_found');
    // TODO check if this function returns false in case of a non existing org or user
    const allowed = await checkPermsForOrganization(
      invitingUser._id,
      this.organizationId,
      'admin'
    );

    if (!allowed) {
      throw new Error('invitation_inviting_user_insufficient_rights');
    }
  }

  getFindInvitationQuery() {
    return {
      'target.type': invitationTargetTypes.ORGANIZATION,
      'target.organizationId': this.organizationId,
    };
  }

  getInvitationDocumentProperties() {
    return {
      type: invitationTargetTypes.ORGANIZATION,
      organizationId: this.organizationId,
      role: this.role,
    };
  }

  async getCreatedInvitationNotificationTitle(locale) {
    await intlInit(locale);
    const organization = await this.getOrganization();

    const title = formatMessage('invitations:join_organization_title', {
      organizationName: organization.name,
    });

    return title;
  }

  async getUpdatedInvitationNotificationTitle(locale, translatedStatus) {
    await intlInit(locale);
    const organization = await this.getOrganization();

    const title = formatMessage('invitations:updated_join_organization_title', {
      organizationName: organization.name,
      status: translatedStatus,
    });

    return title;
  }

  // eslint-disable-next-line class-methods-use-this
  getCreatedInvitationNotificationTemplateName(locale) {
    let template = 'send_invitation_to_join_organization_en';
    switch (locale) {
      case supportedLocales.FR:
        template = 'send_invitation_to_join_organization_fr';
        break;

      case supportedLocales.EN:
      default:
        template = 'send_invitation_to_join_organization_en';
    }

    return template;
  }

  // eslint-disable-next-line class-methods-use-this
  getUpdatedInvitationNotificationTemplateName(locale) {
    let template = 'send_updated_invitation_to_join_organization_en';
    switch (locale) {
      case supportedLocales.FR:
        template = 'send_updated_invitation_to_join_organization_fr';
        break;

      case supportedLocales.EN:
      default:
        template = 'send_updated_invitation_to_join_organization_en';
    }

    return template;
  }

  async getCreatedInvitationNotificationTemplateParameters(locale) {
    const organization = await this.getOrganization();
    await intlInit(locale);

    let messageKey = 'organizations:roleMember';
    if (this.role === invitationOrganizationRoles.ADMIN) {
      messageKey = 'organizations:roleAdmin';
    }
    const role = formatMessage(messageKey);

    return {
      organizationName: capitalize(organization.name),
      organizationRole: role,
    };
  }

  async getUpdatedInvitationNotificationTemplateParameters(locale) {
    const templateParameters =
      await this.getCreatedInvitationNotificationTemplateParameters(locale);
    return templateParameters;
  }

  // eslint-disable-next-line no-unused-vars
  async init({ invitedUser, invitingUser }) {
    const organization = await this.getOrganization();
    // organization must always exist
    if (!organization) throw new Error('organization_not_found');
  }
}
