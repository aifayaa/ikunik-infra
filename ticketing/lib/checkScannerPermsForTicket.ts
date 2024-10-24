/* eslint-disable import/no-relative-packages */
import BadgeChecker from '@libs/badges/BadgeChecker';
import mongoCollections from '@libs/mongoCollections.json';
import getBookable from './getBookable';
import getTicket from './getTicket';
import MongoClient from '@libs/mongoClient';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  BOOKABLE_SCANNER_PERMISSION_CODE,
  ERROR_TYPE_ACCESS,
} from '@libs/httpResponses/errorCodes';

const { COLL_USERS } = mongoCollections;

export default async (ticketId: string, appId: string, userId: string) => {
  const client = await MongoClient.connect();

  try {
    const badgeChecker = new BadgeChecker(appId);

    const ticket = await getTicket(ticketId, appId);
    const bookable = await getBookable(ticket.bookableId, appId);

    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId });

    const userBadges = [...((user && user.badges) || [])];

    await badgeChecker.init;

    badgeChecker.registerBadges(userBadges.map(({ id: badgeId }) => badgeId));
    badgeChecker.registerBadges(
      bookable.scannersBadges.list.map(({ id: badgeId }) => badgeId)
    );

    await badgeChecker.loadBadges();

    const checkerResults = await badgeChecker.checkBadges(
      userBadges,
      bookable.scannersBadges,
      { userId, appId }
    );

    if (!checkerResults.canRead) {
      throw new CrowdaaError(
        ERROR_TYPE_ACCESS,
        BOOKABLE_SCANNER_PERMISSION_CODE,
        'Scanner usage not allowed'
      );
    }

    return true;
  } finally {
    client.close();
  }
};
