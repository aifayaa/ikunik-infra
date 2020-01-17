import { MongoClient, ObjectId } from 'mongodb';
import generatePatchUserSelection from '../libs/generatePatchUserSelection';
import getSelectionSubscriptions from '../libs/getSelectionSubscriptions';
import patchUserSelection from '../libs/patchUserSelection';

const {
  COLL_SELECTIONS,
  COLL_SUBSCRIPTIONS,
  DB_NAME,
  MONGO_URL,
} = process.env;

export default async (name, userId, parent, appId) => {
  const client = await MongoClient.connect();
  try {
    const subscriptions = parent
      ? await getSelectionSubscriptions(parent, userId)
      : [{
        _id: ObjectId().toString(),
        userId,
        createAt: new Date(),
        price: null,
        name: null,
        duration: null,
        desc: null,
        banners: null,
      }];
    const selection = {
      _id: ObjectId().toString(),
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
      subscriptionIds: subscriptions.map(item => item._id),
      appIds: [appId],
    };
    if (parent) {
      const parentSelection = await client
        .db(DB_NAME)
        .collection(COLL_SELECTIONS)
        .findOne({
          _id: parent,
          appIds: { $elemMatch: { $eq: appId } },
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
          .db(DB_NAME)
          .collection(COLL_SUBSCRIPTIONS)
          .insertMany(subscriptions),
      client
        .db(DB_NAME)
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
