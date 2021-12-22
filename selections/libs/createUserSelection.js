import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import generatePatchUserSelection from './generatePatchUserSelection';
import getSelectionSubscriptions from './getSelectionSubscriptions';
import patchUserSelection from './patchUserSelection';

const {
  COLL_SELECTIONS,
  COLL_SUBSCRIPTIONS,
} = mongoCollections;

export default async (name, userId, parent, appId) => {
  const client = await MongoClient.connect();
  try {
    const subscriptions = parent
      ? await getSelectionSubscriptions(parent, userId)
      : [{
        _id: ObjectID().toString(),
        userId,
        createAt: new Date(),
        price: null,
        name: null,
        duration: null,
        desc: null,
        banners: null,
      }];
    const selection = {
      _id: ObjectID().toString(),
      createAt: new Date(),
      date: 'Anytime',
      isPublished: false,
      isWebPublished: false,
      isMobilePublished: false,
      limit: 10,
      selectionCollection: ['audio', 'video'],
      selectionDisplayName: name,
      selectionName: name,
      selectionOptionQuery: '{}',
      userId,
      subscriptionIds: subscriptions.map((item) => item._id),
      appId,
    };
    if (parent) {
      const parentSelection = await client
        .db()
        .collection(COLL_SELECTIONS)
        .findOne({
          _id: parent,
          appId,
        }, {
          rootSelection: 1,
          subscriptionIds: 1,
          userId: 1,
        });
      if (!parentSelection) throw new Error('parent selection not exists');
      if (parentSelection.userId !== userId) {
        throw new Error('parent selection is owned by an other user');
      }
      selection.rootSelectionId = parentSelection.rootSelectionId || parent;
    }

    const [patch] = await Promise.all([
      parent
        ? generatePatchUserSelection(parent, userId, appId, undefined, [selection._id], 'add')
        : client
          .db()
          .collection(COLL_SUBSCRIPTIONS)
          .insertMany(subscriptions),
      client
        .db()
        .collection(COLL_SELECTIONS)
        .insertOne(selection),
    ]);
    if (parent) {
      await patchUserSelection(parent, userId, patch, true);
    }
    return selection;
  } finally {
    client.close();
  }
};
