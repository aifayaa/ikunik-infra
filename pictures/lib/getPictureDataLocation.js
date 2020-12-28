import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PICTURES,
} = process.env;

const QUALITIES = ['large', 'medium', 'thumb'];

// TODO: add a check to user permission to access pictures not published
export default async (id, appId, { isPublished, quality }) => {
  let client;
  try {
    const $find = {
      _id: id,
      appId,
    };

    if (!quality) {
      quality = 'large,medium,thumb';
    }

    quality = quality.split(',');

    quality.filter((item) => {
      if (QUALITIES.indexOf(item) < 0) {
        return (false);
      }
      return (true);
    });

    if (quality.length === 0) {
      return (null);
    }

    if (typeof isPublished !== 'undefined') {
      $find.isPublished = isPublished;
    }

    client = await MongoClient.connect();
    const picture = await client.db(DB_NAME)
      .collection(COLL_PICTURES)
      .findOne($find);

    if (!picture) {
      return (null);
    }

    let pictureUrl = null;

    for (let i = 0; i < quality.length; i += 1) {
      const key = `${quality[i]}Url`;
      pictureUrl = picture[key];
      if (pictureUrl) {
        return (pictureUrl);
      }
    }

    return (null);
  } finally {
    client.close();
  }
};
