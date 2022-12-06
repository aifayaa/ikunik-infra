import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_MEDIUM_SELECTION_LINKS,
  COLL_SELECTIONS,
} = mongoCollections;

export const doDeleteUserSelection = async (selectionIds, appId) => {
  const client = await MongoClient.connect();
  try {
    Promise.all([
      client
        .db()
        .collection(COLL_SELECTIONS)
        .remove({
          _id: { $in: selectionIds },
          appId,
        }),
      client
        .db()
        .collection(COLL_MEDIUM_SELECTION_LINKS)
        .remove({
          selectionId: { $in: selectionIds },
          appId,
        }),
    ]);
  } finally {
    client.close();
  }
};

export const doDeleteUserSelectionTree = async (userId, selectionId, appId) => {
  const client = await MongoClient.connect();
  try {
    const selection = await client
      .db()
      .collection(COLL_SELECTIONS)
      .findOne(
        {
          _id: selectionId,
          appId,
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
          appId,
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
      .db()
      .collection(COLL_SELECTIONS)
      .aggregate(getChildSelectionIdsPipeline)
      .toArray();
    const { selectionIds } = selectionIdsObj || { selectionIds: [] };
    selectionIds.push(selectionId);

    // remove selection with all child selection
    await doDeleteUserSelection(selectionIds);
    const [remainingMedia] = await client
      .db()
      .collection(COLL_MEDIUM_SELECTION_LINKS)
      .aggregate([
        {
          $match: {
            rootSelectionId,
            appId,
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
      .db()
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
        appId,
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
