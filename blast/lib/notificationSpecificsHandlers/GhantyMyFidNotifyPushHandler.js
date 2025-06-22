/* eslint-disable import/no-relative-packages */
import { GHANTY_MYFID_TO_NOTIFY_TYPES } from '../../../ghanty/lib/ghantyConstants.ts';

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function getUserNotificationStrings(user, type) {
  const { ghantyNotifications } = user.services;

  if (!ghantyNotifications) {
    return { canNotify: false };
  }

  if (Date.now() - ghantyNotifications.updatedAt.getTime() >= ONE_DAY_IN_MS) {
    return { canNotify: false };
  }

  if (type === GHANTY_MYFID_TO_NOTIFY_TYPES.couponExpirations) {
    if (!ghantyNotifications.coupons) {
      return { canNotify: false };
    }

    const { expiringCount = 0, expiresInDays } = ghantyNotifications.coupons;
    if (expiringCount === 0) {
      return { canNotify: false };
    }

    return {
      canNotify: true,
      title:
        expiringCount > 1 ? 'Expiration de coupons' : 'Expiration de coupons',
      content:
        expiringCount > 1
          ? `${expiringCount} coupons arrivent à expiration dans ${expiresInDays}, n'attendez pas pour les utiliser!`
          : `Un coupon arrive à expiration dans ${expiresInDays}, n'attendez pas pour l'utiliser!`,
      extraData: { fidOpenVouchers: true },
    };
  }

  if (type === GHANTY_MYFID_TO_NOTIFY_TYPES.proposalExpirations) {
    if (!ghantyNotifications.proposals) {
      return { canNotify: false };
    }
    const { expiringCount = 0, expiresInDays } = ghantyNotifications.proposals;
    if (expiringCount === 0) {
      return { canNotify: false };
    }

    return {
      canNotify: true,
      title: expiringCount > 1 ? "Expiration d'offres" : "Expiration d'offre",
      content:
        expiringCount > 1
          ? `${expiringCount} offres arrivent à expiration dans ${expiresInDays}, n'attendez pas pour les utiliser!`
          : `Une offre arrive à expiration dans ${expiresInDays}, n'attendez pas pour l'utiliser!`,
      extraData: { fidOpenProposals: true },
    };
  }

  if (type === GHANTY_MYFID_TO_NOTIFY_TYPES.newProposals) {
    if (!ghantyNotifications.proposals) {
      return { canNotify: false };
    }

    const { ids: newIds } = ghantyNotifications.proposals;
    const { ids: oldIds = [] } = ghantyNotifications.lastProposals || {};

    const foundNewProposals = newIds.filter((id) => oldIds.indexOf(id) < 0);
    const newProposalsCount = foundNewProposals.length;

    if (newProposalsCount === 0 || newIds.length === 0) {
      return { canNotify: false };
    }

    return {
      canNotify: true,
      title: newProposalsCount > 1 ? 'Nouvelles offres' : 'Nouvelle offre',
      content:
        newProposalsCount > 1
          ? `Suite à vos derniers achats, ${newProposalsCount} nouvelles offres sont disponibles, n'attendez pas pour les utiliser!`
          : `Suite à vos derniers achats, une nouvelle offre est disponible, n'attendez pas pour l'utiliser!`,
      extraData: { fidOpenProposals: true },
    };
  }

  return { canNotify: false };
}

function GhantyMyFidNotifyPushHandler() {}

GhantyMyFidNotifyPushHandler.prototype.init = function init() {
  this.notify = this.queueData.notify;

  if (!GHANTY_MYFID_TO_NOTIFY_TYPES[this.notify]) {
    return Promise.resolve(false);
  }

  return Promise.resolve(true);
};

GhantyMyFidNotifyPushHandler.prototype.processOne = function processOne({
  user,
}) {
  const { notify } = this;

  if (!user) return { canNotify: false };

  const { canNotify, title, content, extraData } = getUserNotificationStrings(
    user,
    notify
  );

  return {
    canNotify,
    data: {
      content,
      extraData,
      isText: true,
      title,
    },
  };
};

GhantyMyFidNotifyPushHandler.prototype.batchDone = function batchDone() {};

export default GhantyMyFidNotifyPushHandler;
