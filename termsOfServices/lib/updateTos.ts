/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { DocumentType } from './type';
import { computeS3Filepath, writeS3TosBucket } from './utils';

const { COLL_TOS } = mongoCollections;

export default async (
  appId: string,
  tosId: string,
  userId: string,
  fieldsToSet: {
    title?: string;
    html?: string;
    type?: DocumentType;
    outdated?: boolean;
    required?: boolean;
  }
) => {
  const client = await MongoClient.connect();
  try {
    const { title, html, type } = fieldsToSet;
    if (title && html && type) {
      const s3Filepath = computeS3Filepath(tosId, appId, type);
      await writeS3TosBucket(s3Filepath, title, html);
    }

    await client
      .db()
      .collection(COLL_TOS)
      .updateOne(
        { _id: tosId, appId },
        {
          $set: {
            ...fieldsToSet,
            updatedAt: new Date(),
            updatedBy: userId,
          },
        }
      );

    const modifiedTos = await client
      .db()
      .collection(COLL_TOS)
      .findOne({ _id: tosId, appId });

    return modifiedTos;
  } finally {
    client.close();
  }
};
