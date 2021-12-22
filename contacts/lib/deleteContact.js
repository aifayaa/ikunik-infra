import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_CONTACTS,
  COLL_ARTIST_CONTACT_LIST,
} = mongoCollections;

export default async (_userId, profileId, contactId, appId) => {
  const client = await MongoClient.connect();
  try {
    await client.db()
      .collection(COLL_CONTACTS)
      .deleteOne({
        _id: contactId,
        appId,
        invitedByProfil_ID: profileId,
      });

    // Updates all contact lists
    await client
      .db()
      .collection(COLL_ARTIST_CONTACT_LIST)
      .updateMany({
        appId,
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
