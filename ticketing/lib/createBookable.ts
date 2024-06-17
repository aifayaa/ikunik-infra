/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { BookableType } from './bookableEntity';

const { COLL_BOOKABLES } = mongoCollections;

export type CreateBookableType = {
  name: string;
  description: string;
  disabled: boolean;
  trashed: boolean;
  limits: {
    notBefore: string;
    notAfter: string;
    maxTickets: number;
    maxTicketsPerAccount: number;
  };
  pricingId: string | null;
};

export default async (
  appId: string,
  userId: string,
  bookableData: CreateBookableType
) => {
  const client = await MongoClient.connect();

  try {
    const newBookable = {
      ...bookableData,
      _id: new ObjectID().toString(),
      appId,
      createdBy: userId,
      createdAt: new Date(),
    } as BookableType;

    await client.db().collection(COLL_BOOKABLES).insertOne(newBookable);

    return newBookable;
  } finally {
    client.close();
  }
};
