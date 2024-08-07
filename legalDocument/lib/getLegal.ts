/* eslint-disable import/no-relative-packages */
import util from 'util';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  LEGAL_DOCUMENT_NOT_FOUND_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { LegalDocumentType } from './type';

const { COLL_TOS } = mongoCollections;

export default async function (
  appId: string,
  options: {
    legalDocumentId?: string;
    // type?: LegalDocumentType;
    outdated?: boolean;
    required?: boolean;
  }
) {
  const client = await MongoClient.connect();

  try {
    const query: {
      appId: string;
      // type?: LegalDocumentType;
      _id?: string;
      $or?: Array<object>;
      outdated?: boolean;
      required?: boolean;
    } = {
      appId,
    };

    const $or: Array<object> = [];
    // if (options.type) {
    //   if (options.type === 'tos') {
    //     $or.push({ type: 'tos' });
    //     $or.push({ type: { $exists: false } });
    //   } else {
    //     query.type = options.type;
    //   }
    // }

    if (options.legalDocumentId) {
      query._id = options.legalDocumentId;
    }

    if (options.outdated !== undefined) {
      query.outdated = options.outdated;
    }

    if (options.required !== undefined) {
      query.required = options.required;
    }

    if ($or.length) {
      query.$or = $or;
    }

    const DBCollection = client.db().collection(COLL_TOS);
    if (options.legalDocumentId) {
      const res = await DBCollection.findOne(query);

      if (!res) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_FOUND,
          LEGAL_DOCUMENT_NOT_FOUND_CODE,
          `Cannot found legal document '${options.legalDocumentId}' for application '${appId}'\n` +
            `options: ${util.inspect(options)}`
        );
      }
      return res;
    } else {
      return await DBCollection.find(query, {
        sort: { createdAt: -1 },
      }).toArray();
    }
  } finally {
    client.close();
  }
}
