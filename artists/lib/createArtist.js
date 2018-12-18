import { MongoClient, ObjectID } from 'mongodb';

const splitParagraphes = (biography = '') => {
  const tmp = biography.split(/(?:\r\n|\r|\n)/g);
  const paragraphes = [];

  for (let i = 0; i < tmp.length; i += 1) {
    const paragraph = { num: i, content: tmp[i] };
    paragraphes.push(paragraph);
  }
  return paragraphes;
};

export default async (userId, info) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const profil = await client.db(process.env.DB_NAME).collection('profil')
      .findOne({ UserId: userId }, { projection: { _id: true } });
    if (!profil) {
      throw new Error('profil_not_found');
    }
    const artist = {
      _id: new ObjectID().toString(),
      artistName: info.name,
      profil_ID: profil._id,
      biography: info.biography,
      paragraphes: splitParagraphes(info.biography),
      facebook: info.facebook,
      instagram: info.instagram,
      snapshat: info.snapchat,
      twitter: info.twitter,
    };

    const _id = await client.db(process.env.DB_NAME).collection('artists')
      .insertOne(artist);
    return { _id, ...artist };
  } finally {
    client.close();
  }
};
