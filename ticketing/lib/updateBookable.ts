/* eslint-disable import/no-relative-packages */
import { getDetailedPictureFields } from '@libs/utils';
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
  pictureId?: string | null;
  'scannersBadges.list'?: string[];
  'scannersBadges.allow'?: 'all' | 'any';
};

export default async (
  bookableId: string,
  appId: string,
  userId: string,
  { pictureId, ...bookableData }: UpdateBookableType
) => {
  const client = await MongoClient.connect();

  try {
    const bookableUpdates: any = {
      $set: {
        ...bookableData,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    };

    if (pictureId) {
      const pictureField = await getDetailedPictureFields(pictureId, {
        client,
      });
      if (pictureField) {
        bookableUpdates.$set.picture = pictureField;
      }
    } else {
      bookableUpdates.$set.picture = null;
    }

    await client
      .db()
      .collection(COLL_BOOKABLES)
      .updateOne({ _id: bookableId, appId }, bookableUpdates);

    const updatedBookable = await client
      .db()
      .collection(COLL_BOOKABLES)
      .findOne({ _id: bookableId, appId });

    return updatedBookable;
  } finally {
    client.close();
  }
};
