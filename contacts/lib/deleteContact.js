import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_CONTACTS,
  COLL_ARTIST_CONTACT_LIST,
} = process.env;
export default async (_userId, profileId, contactId, appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    await client.db(DB_NAME)
      .collection(COLL_CONTACTS)
      .deleteOne({
        _id: contactId,
        appIds: { $elemMatch: { $eq: appId } },
        invitedByProfil_ID: profileId,
      });

    // Updates all contact lists
    await client
      .db(DB_NAME)
      .collection(COLL_ARTIST_CONTACT_LIST)
      .updateMany({
        appIds: { $elemMatch: { $eq: appId } },
        contactIDs: contactId,
        profil_ID: profileId,
      }, {
        $pull: { contactIDs: contactId },
      });

    return true;
  } finally {
    client.close();
  }
};
