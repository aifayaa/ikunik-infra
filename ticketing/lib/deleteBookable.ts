/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { BookableType } from './bookableEntity';

const { COLL_BOOKABLES } = mongoCollections;

export default async (bookableId: string, appId: string) => {
  const client = await MongoClient.connect();

  try {
    const bookable = await client
      .db()
      .collection(COLL_BOOKABLES)
      .findOne({ _id: bookableId, appId });

    if (bookable) {
      await client
        .db()
        .collection(COLL_BOOKABLES)
        .deleteOne({ _id: bookableId, appId });
    }

    return bookable as BookableType;
  } finally {
    client.close();
  }
};
