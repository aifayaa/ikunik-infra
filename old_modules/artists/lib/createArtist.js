import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const splitParagraphes = (biography = '') => {
  const tmp = biography.split(/(?:\r\n|\r|\n)/g);
  const paragraphes = [];

  for (let i = 0; i < tmp.length; i += 1) {
    const paragraph = { num: i, content: tmp[i] };
    paragraphes.push(paragraph);
  }
  return paragraphes;
};

export default async (userId, profileId, appId, info) => {
  const client = await MongoClient.connect();
  try {
    const artist = {
      _id: new ObjectID().toString(),
      artistName: info.name,
      profil_ID: profileId,
      biography: info.biography,
      paragraphes: splitParagraphes(info.biography),
      facebook: info.facebook,
      instagram: info.instagram,
      snapshat: info.snapchat,
      twitter: info.twitter,
      appId,
    };

    const _id = await client
      .db()
      .collection(mongoCollections.COLL_ARTISTS)
      .insertOne(artist);
    return { _id, ...artist };
  } finally {
    client.close();
  }
};
