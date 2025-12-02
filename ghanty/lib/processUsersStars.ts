import { MyFidApi } from '@libs/backends/ghanty-myfid';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_FOUND,
} from '@libs/httpResponses/errorCodes';
import MongoClient, { ObjectID } from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { ghantyDisabledAccounts } from './ghantyUtils';

const { COLL_APPS, COLL_GHANTY_MYFID_USERS_STARS, COLL_USERS } =
  mongoCollections;

type GhantyMyFidUsersStarsType = {
  _id: ObjectID;
  username: string;
  inputAt: Date;
  requiresUpdate: boolean;
  processedAt?: Date;

  lastError?: {
    statusCode?: number;
    error?: string;
    message: string;
  };
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

const FROM_DATE = new Date('2025-12-01T00:00:00+0400');
const TO_DATE = new Date('2026-01-01T00:00:00+0400');

const LAMBDA_TIMEOUT = (300 - 30) * 1000; // Timeout with a safety margin

const TICKETS_PER_PAGE = 30;

function setToArray<T>(set: Set<T>) {
  const ret: Array<T> = [];

  set.forEach((item) => {
    ret.push(item);
  });

  return ret;
}

async function markItemAsProcessed(item: GhantyMyFidUsersStarsType, db: any) {
  await db.collection(COLL_GHANTY_MYFID_USERS_STARS).updateOne(
    {
      _id: item._id,
      username: item.username,
      inputAt: item.inputAt, // Skip updating if there was an other update
      requiresUpdate: true,
    },
    {
      $set: {
        processedAt: new Date(),
        requiresUpdate: false,
      },
    }
  );
}

type MyFidAPIException = Error & {
  statusCode?: number;
  error?: string;
  message: string;
};

async function tryCallAPI(
  fidApi: MyFidApi,
  item: GhantyMyFidUsersStarsType,
  page: number,
  { db }: { db: any }
) {
  let lastError: MyFidAPIException | null = null;

  for (let i = 0; i < 5; i += 1) {
    try {
      const response: GhantyMyFidAPITransactionsResponse = await fidApi.call(
        `/users/${item.username}/transactions?pageSize=${TICKETS_PER_PAGE}&pageNumber=${page}`
      );

      return response;
    } catch (e) {
      const error = e as MyFidAPIException;

      lastError = error;
    }
  }

  if (lastError) {
    await db.collection(COLL_GHANTY_MYFID_USERS_STARS).updateOne(
      { _id: item._id },
      {
        $set: {
          requiresUpdate: false,
          lastError: {
            statusCode: lastError.statusCode,
            error: lastError.error,
            message: lastError.message,
          },
        },
      }
    );
  }

  throw lastError;
}

export default async (appId: string) => {
  const endProcessingAt = new Date(Date.now() + LAMBDA_TIMEOUT);
  const client = await MongoClient.connect();

  try {
    const db = client.db();
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `App with ID ${appId} not found!`
      );
    }

    const toProcess = await db
      .collection(COLL_GHANTY_MYFID_USERS_STARS)
      .find({ requiresUpdate: true });

    const fidApi = new MyFidApi(app);
    await fidApi.renewAPITokenIfNeeded(client);

    let foundItems = 0;
    let markedAsProcessed = 0;
    let disabledUsers = 0;
    let fidApiErrors = 0;

    while (
      (await toProcess.hasNext()) &&
      Date.now() < endProcessingAt.getTime()
    ) {
      const item: GhantyMyFidUsersStarsType = await toProcess.next();
      foundItems += 1;

      if (ghantyDisabledAccounts.includes(item.username)) {
        disabledUsers += 1;
        await db
          .collection(COLL_GHANTY_MYFID_USERS_STARS)
          .deleteOne({ _id: item._id });

        continue;
      }

      try {
        let shouldMarkAsProcessed = false;
        let reachedEnd = false;
        let processedTickets = 0;
        let page = 1;
        const brands = new Set<string>();

        do {
          const response = await tryCallAPI(fidApi, item, page, { db });

          response.transactions.forEach((transaction) => {
            const transactionDate = new Date(`${transaction.date} +0400`);

            if (
              transactionDate.getTime() >= FROM_DATE.getTime() &&
              transactionDate.getTime() < TO_DATE.getTime()
            ) {
              brands.add(transaction.brand);
            } else if (transactionDate.getTime() < FROM_DATE.getTime()) {
              reachedEnd = true;
              shouldMarkAsProcessed = true;
            }
          });

          processedTickets += response.transactions.length;

          if (response.transactions.length < TICKETS_PER_PAGE) {
            reachedEnd = true;
            if (processedTickets === response.total) {
              // If not the case, other transaction may have been added in the meantime, it will need an other processing.
              shouldMarkAsProcessed = true;
            }
          }

          page += 1;
        } while (!reachedEnd && Date.now() < endProcessingAt.getTime());

        const stars = brands.size;
        const enseignes = setToArray(brands);

        await db.collection(COLL_USERS).updateOne(
          { appId, username: item.username },
          {
            $set: {
              'profile.stars': stars,
              'profile.enseignes': enseignes,
            },
          }
        );

        if (shouldMarkAsProcessed) {
          markedAsProcessed += 1;
          await markItemAsProcessed(item, db);
        }
      } catch (e) {
        console.log('Caught error during loop :', `${e}`);
      }
    }

    return {
      foundItems,
      markedAsProcessed,
      disabledUsers,
      fidApiErrors,
      dateIsOk: Date.now() < endProcessingAt.getTime(),
    };
  } finally {
    await client.close();
  }
};
