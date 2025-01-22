/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';

const { COLL_APPS, COLL_USERS, COLL_USER_BADGES } = mongoCollections;

const COMMA = ',';
const QUOTE = '"';
const QUOTE_REGEX = new RegExp(QUOTE, 'g');
const TOQUOTE_REGEX = /[^a-zA-Z0-9+.@ _[\]{}()-]/;

function escapeField(field) {
  if (!field || typeof field !== 'string') return '';
  if (field.match(TOQUOTE_REGEX)) {
    const escaped = field.replace(QUOTE_REGEX, `${QUOTE}${QUOTE}`);
    return `${QUOTE}${escaped}${QUOTE}`;
  }
  return field;
}

function formatCSVLine(fields) {
  return `${fields.map(escapeField).join(COMMA)}\n`;
}

export default async (appId, { fields, wholeProfile, ownedBadges }) => {
  const client = await MongoClient.connect();
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const userBadges = await client
      .db()
      .collection(COLL_USER_BADGES)
      .find({ appId })
      .toArray();
    const badgesMap = userBadges.reduce((acc, itm) => {
      acc[itm._id] = itm;
      return acc;
    }, {});

    const usersCursor = client.db().collection(COLL_USERS).find({ appId });

    if (wholeProfile) {
      const profileFields = {};
      await usersCursor.forEach((user) => {
        if (user && user.profile) {
          Object.keys(user.profile).forEach((key) => {
            profileFields[key] = true;
          });
        }
      });
      Object.keys(profileFields).forEach((key) => {
        const fullKey = `user.profile.${key}`;
        if (fields.indexOf(fullKey) < 0) {
          fields.push(fullKey);
        }
      });
      usersCursor.rewind();
    }

    if (ownedBadges) {
      fields.push('ownedBadges');
    }

    if (fields.length === 0) {
      throw new Error('No fields requested!');
    }

    let ret = formatCSVLine(fields);

    await usersCursor.forEach((user) => {
      const lookupObject = { user, app };
      if (ownedBadges) {
        const badges = (user && user.badges) || [];
        lookupObject.ownedBadges = [];
        badges.forEach(({ id, status = 'assigned' }) => {
          if (
            badgesMap[id] &&
            (status === 'validated' || status === 'assigned')
          ) {
            lookupObject.ownedBadges.push(badgesMap[id].name);
          }
        });
        lookupObject.ownedBadges = lookupObject.ownedBadges.join(', ');
      }

      const toPrint = fields.map((field) => {
        const value = objGet(lookupObject, field, false);
        return value || '';
      });
      ret = `${ret}${formatCSVLine(toPrint)}`;
    });

    return ret;
  } finally {
    client.close();
  }
};
