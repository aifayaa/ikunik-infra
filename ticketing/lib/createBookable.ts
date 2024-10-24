/* eslint-disable import/no-relative-packages */
import { getDetailedPictureFields } from '@libs/utils';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { BookableType } from './bookableEntity';

const { COLL_BOOKABLES, COLL_PICTURES } = mongoCollections;

export type CreateBookableType = {
  name: string;
  description: string;
  disabled: boolean;
  limits: {
    notBefore: Date;
    notAfter: Date;
    maxTickets: number;
    maxTicketsPerAccount: number;
  };
  pricingId: string | null;
  pictureId: string | null;
  scannersBadges: {
    list: { id: string }[];
    allow: 'any' | 'all';
  };
};

export default async (
  appId: string,
  userId: string,
  { pictureId, ...bookableData }: CreateBookableType
) => {
  const client = await MongoClient.connect();

  try {
    const newBookable: BookableType = {
      ...bookableData,
      picture: null,
      _id: new ObjectID().toString(),
      appId,
      createdBy: userId,
      createdAt: new Date(),
    };

    if (pictureId) {
      const pictureField = await getDetailedPictureFields(pictureId, {
        client,
      });
      if (pictureField) {
        newBookable.picture = pictureField;
      }
    }

    await client.db().collection(COLL_BOOKABLES).insertOne(newBookable);

    return newBookable;
  } finally {
    client.close();
  }
};
