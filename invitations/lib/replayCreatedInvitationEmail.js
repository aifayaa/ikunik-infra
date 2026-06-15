/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendInvitationEmailToAdmin } from './sendInvitationEmailToAdmin';

const { COLL_INVITATIONS, COLL_ORGANIZATIONS } = mongoCollections;

const getAppRegion = () => {
  const { CROWDAA_REGION, STAGE } = process.env;

  if (['dev', 'preprod'].includes(STAGE)) {
    return `${STAGE}-${CROWDAA_REGION}`;
  }

  if (STAGE === 'prod') {
    return `${CROWDAA_REGION}`;
  }

  return CROWDAA_REGION;
};

function generateInvitationUrl(invitationId, challengeCode) {
  return `https://${process.env.DASHBOARD_V2_DOMAIN}/${getAppRegion()}/invitations/${invitationId}?challengeCode=${challengeCode}&utm_source=invitation`;
}

function getTemplate(locale) {
  return locale === 'fr'
    ? 'send_invitation_to_join_organization_fr'
    : 'send_invitation_to_join_organization_en';
}

function getSubject({ locale, organizationName }) {
  if (locale === 'fr') {
    return `Invitation a rejoindre ${organizationName}`;
  }

  return `Invitation to join ${organizationName}`;
}

function getRoleLabel({ locale, role }) {
  if (locale === 'fr') {
    return role === 'admin' ? 'Administrateur' : 'Membre';
  }

  return role === 'admin' ? 'Admin' : 'Member';
}

function getInvitingUsername(invitationDocument) {
  const profile =
    invitationDocument.source && invitationDocument.source.profile
      ? invitationDocument.source.profile
      : {};
  return (
    profile.username ||
    [profile.firstname, profile.lastname].filter(Boolean).join(' ') ||
    profile.email ||
    invitationDocument.fromUserId
  );
}

export async function replayCreatedInvitationEmail(invitationId) {
  if (!invitationId) {
    throw new Error('invitationId is required');
  }

  const mongoClient = await MongoClient.connect();

  try {
    const db = mongoClient.db();
    const invitationDocument = await db
      .collection(COLL_INVITATIONS)
      .findOne({ _id: invitationId });

    if (!invitationDocument) {
      throw new Error(`Invitation '${invitationId}' not found`);
    }

    if (
      !invitationDocument.method ||
      invitationDocument.method.type !== 'email' ||
      !invitationDocument.method.emailAddress
    ) {
      throw new Error(
        `Invitation '${invitationId}' is not an email invitation`
      );
    }

    if (
      !invitationDocument.target ||
      invitationDocument.target.type !== 'organization'
    ) {
      throw new Error(
        `Invitation '${invitationId}' is not an organization invitation`
      );
    }

    const organization = await db.collection(COLL_ORGANIZATIONS).findOne({
      _id: invitationDocument.target.organizationId,
    });
    const organizationName =
      (organization && organization.name) ||
      invitationDocument.target.organizationName ||
      invitationDocument.target.organizationId;
    const locale = invitationDocument.toUserLocale || 'en';
    const template = getTemplate(locale);
    const target = {
      type: invitationDocument.target.type,
      organizationId: invitationDocument.target.organizationId,
      organizationName,
      role: invitationDocument.target.role,
    };

    const notificationResult = await sendInvitationEmailToAdmin({
      originalTo: invitationDocument.method.emailAddress,
      subject: getSubject({ locale, organizationName }),
      template,
      vars: {
        organizationName,
        organizationRole: getRoleLabel({
          locale,
          role: invitationDocument.target.role,
        }),
        invitingUsername: getInvitingUsername(invitationDocument),
        url: generateInvitationUrl(
          invitationDocument._id,
          invitationDocument.challengeCode
        ),
      },
      context: {
        invitationId,
        notificationType: 'created_replay',
        target,
      },
    });

    await db.collection(COLL_INVITATIONS).updateOne(
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
            targetType: target.type,
            organizationId: target.organizationId,
            role: target.role,
            replayed: true,
          },
        },
      }
    );

    return {
      invitationId,
      status: invitationDocument.status,
      notification: notificationResult,
    };
  } finally {
    await mongoClient.close();
  }
}
