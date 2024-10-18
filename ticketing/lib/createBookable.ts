/* eslint-disable import/no-relative-packages */
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
  pictureId?: string;
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

    if (bookableData.pictureId) {
      const picture = await client
        .db()
        .collection(COLL_PICTURES)
        .findOne({ _id: bookableData.pictureId });
      if (picture) {
        const haveUrl =
          picture.thumbUrl ||
          picture.mediumUrl ||
          picture.largeUrl ||
          picture.pictureUrl;
        if (haveUrl) {
          newBookable.picture = {
            _id: picture._id,
            thumbUrl: picture.thumbUrl,
            mediumUrl: picture.mediumUrl,
            largeUrl: picture.largeUrl,
            pictureUrl: picture.pictureUrl,
          };
        }
      }
    }

    await client.db().collection(COLL_BOOKABLES).insertOne(newBookable);

    return newBookable;
  } finally {
    client.close();
  }
};
