import { MyFidApi } from '@libs/backends/ghanty-myfid';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import {
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';

const { COLL_APPS, COLL_USERS, COLL_GHANTY_MYFID_USERS_STARS } =
  mongoCollections;

const FROM_DATE = new Date('2025-12-01T00:00:00+0400');
const TO_DATE = new Date('2026-01-01T00:00:00+0400');

const TICKETS_PER_PAGE = 30;

type MyFidAPIException = Error & {
  statusCode?: number;
  error?: string;
  message: string;
};

type GhantyMyFidAPITransactionsResponse = {
  transactions: Array<{
    id: string;
    date: string;
    shop: string;
    brand: string;
    amount: number;
    pointsEarned: number;
    items: Array<{
      description: null;
      code: string;
      quantity: number;
      amount: number;
    }>;
  }>;
  total: number;
};

const { STAGE, REGION } = process.env as { STAGE: string; REGION: string };

const lambda = new LambdaClient({
  apiVersion: '2016-06-27',
  region: REGION,
});

export async function sendNotificationToUser(userId: string, appId: string) {
  const notifyData = {
    appId: appId,
    notifyAt: new Date(),
    type: 'genericPush',
    only: 'users',
    data: {
      userIds: [userId],
      title: 'Les Étoiles Magiques ⭐',
      content: 'Une nouvelle étoile a été ajoutée !',
    },
  };

  await lambda.send(
    new InvokeCommand({
      InvocationType: 'Event',
      FunctionName: `blast-${STAGE}-queueNotifications`,
      Payload: JSON.stringify(notifyData),
    })
  );
}

function setToArray<T>(set: Set<T>) {
  const ret: Array<T> = [];

  set.forEach((item) => {
    ret.push(item);
  });

  return ret;
}

async function tryCallAPI(fidApi: MyFidApi, username: string, page: number) {
  let lastError: MyFidAPIException | null = null;

  for (let i = 0; i < 5; i += 1) {
    try {
      const response: GhantyMyFidAPITransactionsResponse = await fidApi.call(
        `/users/${username}/transactions?pageSize=${TICKETS_PER_PAGE}&pageNumber=${page}`
      );

      return response;
    } catch (e) {
      const error = e as MyFidAPIException;

      lastError = error;
    }
  }

  throw lastError;
}

export default async (appId: string, userId: string) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId });

    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `App with ID ${appId} not found!`
      );
    } else if (!user) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `User with ID ${userId} not found!`
      );
    }

    const fidApi = new MyFidApi(app);
    await fidApi.renewAPITokenIfNeeded(client);

    let reachedEnd = false;
    let page = 1;
    const brands = new Set<string>();

    do {
      const response = await tryCallAPI(fidApi, user.username, page);

      response.transactions.forEach((transaction) => {
        const transactionDate = new Date(`${transaction.date} +0400`);

        if (
          transactionDate.getTime() >= FROM_DATE.getTime() &&
          transactionDate.getTime() < TO_DATE.getTime()
        ) {
          brands.add(transaction.brand);
        } else if (transactionDate.getTime() < FROM_DATE.getTime()) {
          reachedEnd = true;
        }
      });

      if (response.transactions.length < TICKETS_PER_PAGE) {
        reachedEnd = true;
      }

      page += 1;
    } while (!reachedEnd);

    const stars = brands.size;
    const enseignes = setToArray(brands);

    await db.collection(COLL_USERS).updateOne(
      { _id: user._id, appId },
      {
        $set: {
          'profile.stars': stars,
          'profile.enseignes': enseignes,
        },
      }
    );

    const userStars = (user.profile && user.profile.stars) || 0;
    if (userStars < stars) {
      await sendNotificationToUser(user._id, appId);
    }

    return { stars };
  } finally {
    await client.close();
  }
};
