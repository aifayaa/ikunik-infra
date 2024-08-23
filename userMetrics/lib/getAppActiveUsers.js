/* eslint-disable import/no-relative-packages */
import { computePlanDates } from '../../appsFeaturePlans/lib/getCurrentPlan.ts';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_METRICS } = mongoCollections;

// period = 0 => current billing period
// period = -1 => previous billing period
// period = -2 => previous previous billing period
// etc.
export async function getAppActiveUsers(app, { period = 0, now = new Date() }) {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const planDate = app.featurePlan
      ? app.featurePlan.startDate
      : app.createdAt;
    const targetDate = new Date(now);
    if (period !== 0) {
      targetDate.setTime(planDate.getTime()); // Copy the plan date
      targetDate.setDate(targetDate.getDate() + 15); // Half a month
      targetDate.setFullYear(now.getFullYear()); // Set to current year
      targetDate.setMonth(now.getMonth() + period); // Set to current month + shift
    }

    const [startDate, endDate] = computePlanDates(
      'month',
      'rolling',
      planDate,
      targetDate
    );

    const [{ count = 0 } = {}] = await db
      .collection(COLL_USER_METRICS)
      .aggregate([
        {
          $match: {
            appId: app._id,
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

    return {
      count,
      dates: { from: startDate, to: endDate, planStart: planDate },
      period,
    };
  } finally {
    client.close();
  }
}
