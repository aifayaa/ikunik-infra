/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { DocumentType } from './type';
import { computeS3Filepath, writeS3TosBucket } from './utils';

const { COLL_TOS } = mongoCollections;

export default async (
  appId: string,
  title: string,
  html: string,
  {
    userId,
    type,
    outdated,
    required,
  }: {
    userId: string;
    type: DocumentType;
    outdated: boolean;
    required: boolean;
  }
) => {
  const client = await MongoClient.connect();
  try {
    const documentId = ObjectID().toString();
    const s3Filepath = computeS3Filepath(documentId, appId, type);
    const s3GeneratedUrl = await writeS3TosBucket(s3Filepath, title, html);

    const newTos = {
      _id: documentId,
      createdAt: new Date(),
      createdBy: userId,
      url: s3GeneratedUrl,
      appId,
      title,
      html,
      type,
      outdated,
      required,
    };

    await client.db().collection(COLL_TOS).insertOne(newTos);

    return newTos;
  } finally {
    client.close();
  }
};
