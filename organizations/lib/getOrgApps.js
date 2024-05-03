/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (orgId) => {
  const client = await MongoClient.connect();

  try {
    const apps = await client
      .db()
      .collection(COLL_APPS)
      // TODO Il faudra plus d'infos (Ex. status du appSetup, des builds, etc. Retourner le max de choses, sans les secrets)
      /* À filtrer :
       * - credentials
       * - backend
       * - builds.android.googleApiData
       * - builds.android.firebase
       * - settings.iap
       * - settings.chatengine
       * - settings.userDataCollection
       * - settings.saml
       */

      .find({ 'organization._id': orgId }, { projection: { _id: 1, name: 1 } })
      .toArray();

    return apps;
  } finally {
    client.close();
  }
};
