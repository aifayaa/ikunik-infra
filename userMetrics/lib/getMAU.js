/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_METRICS } = mongoCollections;

export async function getNbActiveUsers(db, appId, startDate, endDate) {
  const [{ count = 0 } = {}] = await db
    .collection(COLL_USER_METRICS)
    .aggregate([
      {
        $match: {
          appId,
          $or: [
            {
              $and: [
                { createdAt: { $gte: startDate } },
                { createdAt: { $lt: endDate } },
              ],
            },
            {
              $and: [
                { modifiedAt: { $gte: startDate } },
                { modifiedAt: { $lt: endDate } },
              ],
            },
          ],
        },
      },
      {
        $group: {
          _id: '$deviceId',
        },
      },
      {
        $count: 'count',
      },
    ])
    .toArray();

  return { count };
}

export async function getNbActiveUsersForDay({
  db,
  appId,
  fromStartingDay,
  day,
}) {
  let dayDate = new Date(day);
  dayDate = new Date(
    Date.UTC(
      dayDate.getUTCFullYear(),
      dayDate.getUTCMonth(),
      dayDate.getUTCDate()
    )
  );

  let nextDayDate = new Date(dayDate);
  nextDayDate = new Date(
    Date.UTC(
      nextDayDate.getUTCFullYear(),
      nextDayDate.getUTCMonth(),
      nextDayDate.getUTCDate() + 1
    )
  );

  let fromStartingDayDate = new Date(fromStartingDay);
  fromStartingDayDate = new Date(
    Date.UTC(
      fromStartingDayDate.getUTCFullYear(),
      fromStartingDayDate.getUTCMonth(),
      fromStartingDayDate.getUTCDate()
    )
  );

  const [{ count: countUsersUntilDay }, { count: countUsersUntilPreviousDay }] =
    await Promise.all([
      getNbActiveUsers(db, appId, fromStartingDayDate, nextDayDate),
      getNbActiveUsers(db, appId, fromStartingDayDate, dayDate),
    ]);

  const usersCountForDay =
    countUsersUntilDay > countUsersUntilPreviousDay
      ? countUsersUntilDay - countUsersUntilPreviousDay
      : 0;

  return usersCountForDay;
}

export default async (appId, { month, year }) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const db = client.db();

    return await getNbActiveUsers(db, appId, startDate, endDate);
  } finally {
    client.close();
  }
};
