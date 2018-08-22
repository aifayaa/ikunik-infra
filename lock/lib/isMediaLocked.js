import { MongoClient } from 'mongodb';

export default async (userId, mediaId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const { DB_NAME } = process.env;
  const db = client.db(DB_NAME);

  try {
    const [deadline, audio, video, views] = await Promise.all([
      db.collection('deadlines').findOne({ content_ID: mediaId, userId }),
      db.collection('audio').findOne({ _id: mediaId }),
      db.collection('video').findOne({ _id: mediaId }),
      db.collection('views').findOne({ userID: userId, content_ID: mediaId }),
    ]);
    const media = audio || video;
    const { numviews } = views || { numviews: 0 };
    if (!media) throw new Error('Media not found');
    switch (media.distribution) {
      case 'freeStream': {
        return true;
      }
      case '1free': {
        return numviews < 1;
      }
      case '2free': {
        return numviews < 2;
      }
      case '3free': {
        return numviews < 3;
      }
      case '1freePerDay':
      case '2freePerDay':
      case '3freePerDay': {
        if (!deadline) {
          return true;
        }
        const { deadlineDate, lastView } = deadline;
        if (new Date() > deadlineDate) {
          return true;
        }
        return !!lastView;
      }
      default:
        throw new Error('Invalid media distribution');
    }
  } finally {
    client.close();
  }
};
