import MongoClient from '../../libs/mongoClient';
import { sendEmailTemplate } from '../../libs/email/sendEmail';

const PERMISSIONS = [
  'userGeneratedContents_notify',
  'userGeneratedContents_notify_email',
];

const {
  DB_NAME,
  COLL_USERS,
  COLL_PERM_GROUPS,
} = process.env;

export default async (lang, subject, body, appId) => {
  const client = await MongoClient.connect();
  try {
    const [result] = await client
      .db(DB_NAME)
      .collection(COLL_PERM_GROUPS)
      .aggregate([
        {
          $match: {
            appId,
            $or: PERMISSIONS.map((perm) => ({ [`perms.${perm}`]: true })),
          },
        },
        {
          $lookup: {
            from: COLL_USERS,
            localField: '_id',
            foreignField: 'permGroupIds',
            as: 'users',
          },
        },
        {
          $unwind: {
            path: '$users',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $replaceRoot: { newRoot: '$users' },
        },
        {
          $project: {
            'emails.address': true,
          },
        },
        {
          $unwind: {
            path: '$emails',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $group: {
            _id: '$emails.address',
          },
        },
        {
          $group: {
            _id: null,
            emails: { $push: '$_id' },
          },
        },
      ]).toArray();
    const { emails = [] } = result || {};
    const promises = emails.map((email) => {
      /* in case of error, ignore it, just try with best effort */
      try {
        return sendEmailTemplate(lang, 'clients', email, subject, body);
      } catch (e) {
        console.error(e);
        return null;
      }
    });
    await Promise.all(promises);
  } finally {
    client.close();
  }
};
