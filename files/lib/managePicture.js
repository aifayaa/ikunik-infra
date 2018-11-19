import uuidv4 from 'uuid/v4';
import {
  MongoClient,
} from 'mongodb';

export default async (bucket, object, file) => {
  const {
    Metadata,
  } = file;
  const {
    userid,
    id = uuidv4(),
  } = Metadata;

  if (!userid) throw new Error('missing_user_id');
  if (!id) throw new Error('missing_user_id');

  const pictureDoc = {
    _id: id,
    createdAt: new Date(),
    description: '',
    fromUserId: userid,
    likes: 0,
    mediumFilename: null,
    mediumFileObj_ID: null,
    mediumUrl: '',
    pictureFilename: object.key,
    pictureFileObj_ID: null,
    pictureUrl: `https://s3.amazonaws.com/${bucket.name}/${object.key}`,
    profil_ID: null,
    project_ID: null,
    thumbFilename: null,
    thumbFileObj_ID: null,
    thumbUrl: '',
    title: '',
    views: 0,
    selectedGenres: [],
    isPublished: true,
  };
  const client = await MongoClient.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
  });
  try {
    await client.db(process.env.DB_NAME).collection(process.env.PICTURES_COLL)
      .insertOne(pictureDoc);
  } catch (e) {
    throw e;
  } finally {
    client.close();
  }
  return null;
};
