/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_BOOKABLES } = mongoCollections;

export type UpdateBookableType = {
  name?: string;
  description?: string;
  disabled?: boolean;
  'limits.notBefore'?: Date;
  'limits.notAfter'?: Date;
  'limits.maxTickets'?: number;
  'limits.maxTicketsPerAccount'?: number;
  pricingId?: string | null;
  pictureId?: string;
};

export default async (
  bookableId: string,
  appId: string,
  userId: string,
  bookableData: UpdateBookableType
) => {
  const client = await MongoClient.connect();

  try {
    const bookableUpdates = {
      ...bookableData,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    await client
      .db()
      .collection(COLL_BOOKABLES)
      .updateOne({ _id: bookableId, appId }, { $set: bookableUpdates });

    const updatedBookable = await client
      .db()
      .collection(COLL_BOOKABLES)
      .findOne({ _id: bookableId, appId });

    return updatedBookable;
  } finally {
    client.close();
  }
};
