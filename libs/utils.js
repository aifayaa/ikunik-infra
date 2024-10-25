/* eslint-disable import/no-relative-packages */
import MongoClient from './mongoClient';
import mongoCollections from './mongoCollections.json';

const { COLL_PICTURES } = mongoCollections;

export function objGet(obj, keys, dft) {
  let keysArray = keys;
  let ret = obj;
  if (typeof keys === 'string') {
    keysArray = keys.split('.');
  } else {
    keysArray = Array.prototype.slice.call(keys);
  }

  while (keysArray.length > 0) {
    try {
      const key = keysArray.shift();
      ret = ret[key];
    } catch (e) {
      return dft;
    }
  }

  if (ret === undefined) return dft;

  return ret;
}

export function objSet(obj, keys, value) {
  let cursor = obj;
  let keysArray = keys;
  if (typeof keys === 'string') {
    keysArray = keys.split('.');
  } else {
    keysArray = Array.prototype.slice.call(keys);
  }

  const last = keysArray.pop();
  keysArray.forEach((key) => {
    if (!cursor[key]) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  });
  cursor[last] = value;
  return obj;
}

export function objUnset(obj, keys) {
  let keysArray = keys;
  let cursor = obj;
  if (typeof keys === 'string') {
    keysArray = keys.split('.');
  } else {
    keysArray = Array.prototype.slice.call(keys);
  }

  const last = keysArray.pop();

  while (keysArray.length > 0) {
    try {
      const key = keysArray.shift();
      cursor = cursor[key];
    } catch (e) {
      return;
    }
  }

  if (typeof cursor === 'object') {
    cursor[last] = null;
    delete cursor[last];
  }
}

export function indexObjectArrayWithKey(arrayOfObjects, key = '_id', to = {}) {
  const ret = arrayOfObjects.reduce((acc, obj) => {
    acc[objGet(obj, key)] = obj;
    return acc;
  }, to);

  return ret;
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Taken from https://stackoverflow.com/a/6969486
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* EcmaScript does not ensure keys order in object.
 * However, every implementations nowadays do, and MongoDB
 * assumes it to be working too, so we need to handle it */
export function reorderObjectKeys(object, keys) {
  const finalObject = {};

  const initialObjectKeys = Object.keys(object);

  keys.forEach((key) => {
    if (initialObjectKeys.indexOf(key) >= 0) {
      finalObject[key] = object[key];
    }
  });

  Object.keys(object).forEach((key) => {
    if (keys.indexOf(key) < 0) {
      finalObject[key] = object[key];
    }
  });

  Object.keys(object).forEach((key) => {
    delete object[key];
  });

  Object.keys(finalObject).forEach((key) => {
    object[key] = finalObject[key];
  });

  return finalObject;
}

export function escapeHtmlEntities(html) {
  const tagsToReplace = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  const regExp = new RegExp(`[${Object.keys(tagsToReplace).join('')}]`, 'g');

  return html.replace(regExp, (tag) => tagsToReplace[tag] || tag);
}

export async function getDetailedPictureFields(
  pictureId,
  { client = null } = {}
) {
  let localClient = client;
  if (!client) {
    localClient = await MongoClient.connect();
  }

  try {
    const picture = await localClient
      .db()
      .collection(COLL_PICTURES)
      .findOne({ _id: pictureId });

    if (picture) {
      const haveUrl =
        picture.thumbUrl ||
        picture.mediumUrl ||
        picture.largeUrl ||
        picture.pictureUrl;
      if (haveUrl) {
        return {
          _id: picture._id,
          thumbUrl: picture.thumbUrl,
          mediumUrl: picture.mediumUrl,
          largeUrl: picture.largeUrl,
          pictureUrl: picture.pictureUrl,
        };
      }
    }

    return null;
  } finally {
    if (localClient !== client) {
      await client.close();
    }
  }
}
