/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { LegalDocumentType } from './type';
import {
  computeS3Filepath,
  removeScriptsFromHtml,
  writeS3TosBucket,
} from './utils';

const { COLL_TOS } = mongoCollections;

export default async (
  appId: string,
  legalDocumentId: string,
  userId: string,
  fieldsToSet: {
    title?: string;
    html?: string;
    markdown?: string;
    type?: LegalDocumentType;
    outdated?: boolean;
    required?: boolean;
  }
) => {
  const client = await MongoClient.connect();
  try {
    const $set = {
      ...fieldsToSet,
      url: '' as string | undefined,
      updatedAt: new Date(),
      updatedBy: userId,
    };
    const { title, html, type } = fieldsToSet;
    const filteredHtml = removeScriptsFromHtml(html || '');
    if (title && filteredHtml && type) {
      const s3Filepath = computeS3Filepath(legalDocumentId, appId, type);
      $set.url = await writeS3TosBucket(s3Filepath, title, filteredHtml);
    } else {
      delete $set.url;
    }

    if (filteredHtml) {
      fieldsToSet.html = filteredHtml;
    }

    await client.db().collection(COLL_TOS).updateOne(
      { _id: legalDocumentId, appId },
      {
        $set,
      }
    );

    const modifiedLegalDocument = await client
      .db()
      .collection(COLL_TOS)
      .findOne({ _id: legalDocumentId, appId });

    return modifiedLegalDocument;
  } finally {
    client.close();
  }
};
