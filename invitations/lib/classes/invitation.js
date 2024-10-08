/* eslint-disable import/no-relative-packages */
import { invitationActions, invitationStatuses } from '../../const/invitations';
import {
  CreatingStatus,
  PendingStatus,
  AcceptedStatus,
  DeclinedStatus,
  CanceledStatus,
} from './statuses';
import { AbstractStatus } from './statuses/abstractStatus';
import mongoCollections from '../../../libs/mongoCollections.json';
import { CrowdaaError } from '../../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_NOT_FOUND,
  INVITATION_NOT_FOUND_CODE,
} from '../../../libs/httpResponses/errorCodes.ts';

const { COLL_INVITATIONS } = mongoCollections;

export class Invitation {
  constructor({ mongoClient }) {
    this.mongoClient = mongoClient;
  }

  // should be protected or private
  async findInvitationById(invitationId) {
    const invitation = await this.mongoClient
      .db()
      .collection(COLL_INVITATIONS)
      .findOne({
        _id: invitationId,
      });

    return invitation;
  }

  static getFindInvitationsQuery(currentUserId) {
    // TODO allow access for organization admins and superAdmins
    return {
      $or: [{ fromUserId: currentUserId }, { toUserId: currentUserId }],
    };
  }

  // should be protected or private
  async findInvitations(currentUserId, options) {
    // TODO: should we filter expired invitations ?
    const invitations = await this.mongoClient
      .db()
      .collection(COLL_INVITATIONS)
      .find(Invitation.getFindInvitationsQuery(currentUserId), options)
      .toArray();

    return invitations;
  }

  // should be protected or private
  async countInvitations(currentUserId) {
    // TODO: should we filter expired invitations ?
    const count = await this.mongoClient
      .db()
      .collection(COLL_INVITATIONS)
      .countDocuments(Invitation.getFindInvitationsQuery(currentUserId));

    return count;
  }

  static generateSecretChallengeCode() {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let challengeCode = '';
    for (let i = 0; i < 4; i += 1) {
      challengeCode += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return challengeCode;
  }

  // should be protected or private
  async init({
    fromUserId,
    toUserId,
    target,
    method,
    fromUserLocale,
    toUserLocale,
    expiredAt,
    challengeCode,
    status,
  }) {
    const statusParams = {
      mongoClient: this.mongoClient,
    };

    switch (status) {
      case invitationStatuses.CREATING:
        this.status = new CreatingStatus(statusParams);
        break;

      case invitationStatuses.PENDING:
        this.status = new PendingStatus(statusParams);
        break;

      case invitationStatuses.ACCEPTED:
        this.status = new AcceptedStatus(statusParams);
        break;

      case invitationStatuses.DECLINED:
        this.status = new DeclinedStatus(statusParams);
        break;

      case invitationStatuses.CANCELED:
        this.status = new CanceledStatus(statusParams);
        break;

      default:
        throw new Error('invitation_unknown_status');
    }

    if (!(this.status instanceof AbstractStatus)) {
      throw new Error('invitation_bad_status_instance');
    }

    await this.status.init({
      fromUserId,
      toUserId,
      target,
      method,
      fromUserLocale,
      toUserLocale,
      expiredAt,
      challengeCode,
    });
  }

  /* ****************************************************************************
    Public methods below
  **************************************************************************** */
  async create(fromUserId, invitationParams, fromUserLocale) {
    await this.init({
      fromUserId,
      target: invitationParams.target,
      method: invitationParams.method,
      fromUserLocale,
      toUserLocale: invitationParams.toUserLocale,
      expiredAt: invitationParams.expiredAt,
      status: invitationStatuses.CREATING,
      challengeCode: Invitation.generateSecretChallengeCode(),
    });

    const invitationDocument = await this.status.create();

    return invitationDocument;
  }

  async execAction(currentUserId, invitationId, parameters) {
    const invitation = await this.findInvitationById(
      invitationId,
      currentUserId
    );
    if (!invitation) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        INVITATION_NOT_FOUND_CODE,
        `Cannot found invitation '${invitationId}'`
      );
    }
    const { action, challengeCode } = parameters;

    await this.init({
      fromUserId: invitation.fromUserId,
      toUserId: invitation.toUserId,
      target: invitation.target,
      method: invitation.method,
      fromUserLocale: invitation.fromUserLocale,
      toUserLocale: invitation.toUserLocale,
      expiredAt: invitation.expiredAt,
      status: invitation.status,
      challengeCode: invitation.challengeCode,
    });

    let modifiedCount;
    const actionParams = {
      currentUserId,
      invitationId,
    };
    switch (action) {
      case invitationActions.ACCEPT:
        modifiedCount = await this.status.accept({
          ...actionParams,
          challengeCode,
        });
        break;

      case invitationActions.DECLINE:
        modifiedCount = await this.status.decline({
          ...actionParams,
          challengeCode,
        });
        break;

      case invitationActions.CANCEL:
        modifiedCount = await this.status.cancel(actionParams);
        break;

      case invitationActions.RESEND:
        await this.status.resend(actionParams);
        modifiedCount = 0;
        break;

      default:
        throw new Error(
          'invitation_could_not_determine_action_from_provided_status'
        );
    }

    return modifiedCount;
  }

  async update(currentUserId, invitationId, parameters) {
    const invitation = await this.findInvitationById(
      invitationId,
      currentUserId
    );
    if (!invitation) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        INVITATION_NOT_FOUND_CODE,
        `Cannot found invitation '${invitationId}'`
      );
    }
    const { status, challengeCode } = parameters;

    await this.init({
      fromUserId: invitation.fromUserId,
      toUserId: invitation.toUserId,
      target: invitation.target,
      method: invitation.method,
      fromUserLocale: invitation.fromUserLocale,
      toUserLocale: invitation.toUserLocale,
      expiredAt: invitation.expiredAt,
      status: invitation.status,
      challengeCode: invitation.challengeCode,
    });

    let modifiedCount;
    const actionParams = {
      currentUserId,
      invitationId,
    };
    switch (status) {
      case invitationStatuses.ACCEPTED:
        modifiedCount = await this.status.accept({
          ...actionParams,
          challengeCode,
        });
        break;

      case invitationStatuses.DECLINED:
        modifiedCount = await this.status.decline({
          ...actionParams,
          challengeCode,
        });
        break;

      case invitationStatuses.CANCELED:
        modifiedCount = await this.status.cancel(actionParams);
        break;

      default:
        throw new Error(
          'invitation_could_not_determine_action_from_provided_status'
        );
    }

    return modifiedCount;
  }

  async get(currentUserId, invitationId) {
    const invitationDocument = await this.findInvitationById(invitationId);
    // spec: an unauthenticated user can only access the invitation if
    // it is still pending and not expired
    if (invitationDocument && !currentUserId) {
      if (invitationDocument.status !== invitationStatuses.PENDING) {
        return undefined;
      }
      if (
        invitationDocument.expiredAt &&
        new Date(invitationDocument.expiredAt) < new Date()
      ) {
        return undefined;
      }
    }
    return invitationDocument;
  }

  async getAll(currentUserId, options) {
    const findOptions = {
      skip: options ? options.start : undefined,
      limit: options ? options.limit : undefined,
      sort: {
        // TODO: client should be able to specify sort
        // TODO: add an index on createdAt
        createdAt: -1,
      },
    };
    const invitationDocuments = await this.findInvitations(
      currentUserId,
      findOptions
    );

    return invitationDocuments;
  }

  async getTotalCount(currentUserId) {
    const invitationDocumentsCount = await this.countInvitations(currentUserId);
    return invitationDocumentsCount;
  }

  async resend(currentUserId, invitationId) {
    const invitation = await this.findInvitationById(invitationId);

    if (!invitation) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        INVITATION_NOT_FOUND_CODE,
        `Cannot found invitation '${invitationId}'`
      );
    }

    await this.init({
      fromUserId: invitation.fromUserId,
      toUserId: invitation.toUserId,
      target: invitation.target,
      method: invitation.method,
      fromUserLocale: invitation.fromUserLocale,
      toUserLocale: invitation.toUserLocale,
      expiredAt: invitation.expiredAt,
      status: invitation.status,
      challengeCode: invitation.challengeCode,
    });

    const actionParams = {
      currentUserId,
      invitationId,
    };
    await this.status.resend(actionParams);
  }
}
