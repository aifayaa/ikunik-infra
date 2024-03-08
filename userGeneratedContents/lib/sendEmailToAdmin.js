/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendEmailTemplate } from '../../libs/email/sendEmail';

const { ADMIN_APP } = process.env;

const PERMISSIONS = [
  'userGeneratedContents_notify',
  'userGeneratedContents_notify_email',
];

const { COLL_USERS, COLL_PERM_GROUPS } = mongoCollections;

export default async (lang, subject, body, appId) => {
  const client = await MongoClient.connect();
  try {
    const superAdmins = await client
      .db()
      .collection(COLL_USERS)
      .find(
        { superAdmin: true, appId: ADMIN_APP },
        { projection: { emails: 1 } }
      )
      .toArray();

    const superAdminsEmails = superAdmins.map(
      ({ emails }) => emails[0].address
    );
    const [result] = await client
      .db()
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
      ])
      .toArray();
    const { emails = [] } = result || {};
    superAdminsEmails.forEach((email) => {
      if (emails.indexOf(email) < 0) {
        emails.push(email);
      }
    });
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
