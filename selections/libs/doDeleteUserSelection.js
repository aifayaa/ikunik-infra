import { MongoClient } from 'mongodb';

const {
  COLL_MEDIUM_SELECTION_LINKS,
  COLL_SELECTIONS,
  DB_NAME,
  MONGO_URL,
} = process.env;
export const doDeleteUserSelection = async (selectionIds, appId) => {
  const client = await MongoClient.connect(MONGO_URL);
  try {
    Promise.all([
      client
        .db(DB_NAME)
        .collection(COLL_SELECTIONS)
        .remove({
          _id: { $in: selectionIds },
          appIds: { $elemMatch: { $eq: appId } },
        }),
      client
        .db(DB_NAME)
        .collection(COLL_MEDIUM_SELECTION_LINKS)
        .remove({
          selectionId: { $in: selectionIds },
          appIds: { $elemMatch: { $eq: appId } },
        }),
    ]);
  } finally {
    client.close();
  }
};

export const doDeleteUserSelectionTree = async (userId, selectionId, appId) => {
  const client = await MongoClient.connect(MONGO_URL);
  try {
    const selection = await client
      .db(DB_NAME)
      .collection(COLL_SELECTIONS)
      .findOne(
        {
          _id: selectionId,
          appIds: { $elemMatch: { $eq: appId } },
        },
        { userId: true, rootSelectionId: true, subscriptionIds: true },
      );
    const { rootSelectionId, subscriptionIds } = selection;
    if (!selection) throw new Error('Selection not found');
    if (selection.userId !== userId) throw new Error('not authorized');

    // get ids of all child selections
    const getChildSelectionIdsPipeline = [
      {
        $match: {
          _id: selectionId,
          userId,
          appIds: { $elemMatch: { $eq: appId } },
        },
      },
      {
        $graphLookup: {
          from: COLL_SELECTIONS,
          startWith: '$selectionIds',
          connectFromField: 'selectionIds',
          connectToField: '_id',
          as: 'childs',
        },
      },
      {
        $unwind: {
          path: '$childs',
        },
      },
      {
        $replaceRoot: { newRoot: '$childs' },
      },
      {
        $group: {
          _id: null,
          selectionIds: { $addToSet: '$_id' },
        },
      },
    ];
    const [selectionIdsObj] = await client
      .db(DB_NAME)
      .collection(COLL_SELECTIONS)
      .aggregate(getChildSelectionIdsPipeline)
      .toArray();
    const { selectionIds } = selectionIdsObj || { selectionIds: [] };
    selectionIds.push(selectionId);

    // remove selection with all child selection
    await doDeleteUserSelection(selectionIds);
    const [remainingMedia] = await client
      .db(DB_NAME)
      .collection(COLL_MEDIUM_SELECTION_LINKS)
      .aggregate([
        {
          $match: {
            rootSelectionId,
            appIds: { $elemMatch: { $eq: appId } },
          },
        },
        {
          $group: {
            _id: null,
            mediaIds: { $addToSet: '$mediumId' },
          },
        },
      ]).toArray();
    const { mediaIds } = remainingMedia || { mediaIds: [] };
    await client
      .db(DB_NAME)
      .collection(COLL_MEDIUM_SELECTION_LINKS)
      .updateMany({
        _id: {
          $nin: mediaIds,
        },
        subscriptionIds: {
          $elemMatch: {
            $in: subscriptionIds,
          },
        },
        appIds: { $elemMatch: { $eq: appId } },
      }, {
        $pull: {
          subscriptionIds: {
            $in: subscriptionIds,
          },
        },
      });
  } finally {
    client.close();
  }
};
