/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { LegalDocumentType } from './type';

const { COLL_TOS } = mongoCollections;

export const getTos = async (
  appId: string,
  options: {
    tosId?: string;
    type?: LegalDocumentType;
    outdated?: boolean;
    required?: boolean;
  }
) => {
  const client = await MongoClient.connect();

  try {
    const query: {
      appId: string;
      type?: LegalDocumentType;
      _id?: string;
      $or?: Array<object>;
      outdated?: boolean;
      required?: boolean;
    } = {
      appId,
    };

    const $or: Array<object> = [];
    if (options.type) {
      if (options.type === 'tos') {
        $or.push({ type: 'tos' });
        $or.push({ type: { $exists: false } });
      } else {
        query.type = options.type;
      }
    }

    if (options.tosId) {
      query._id = options.tosId;
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
    if (options.tosId) {
      return await DBCollection.findOne(query, {
        sort: { createdAt: -1 },
      });
    } else {
      return await DBCollection.find(query, {
        sort: { createdAt: -1 },
      }).toArray();
    }
  } finally {
    client.close();
  }
};
