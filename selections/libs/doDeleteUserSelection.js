import { MongoClient } from 'mongodb';

export const doDeleteUserSelection = async (selectionIds) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    Promise.all([
      client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
        .remove({ _id: { $in: selectionIds } }),
      client.db(process.env.DB_NAME).collection('mediumSelectionLinks')
        .remove({ selectionId: { $in: selectionIds } }),
    ]);
  } finally {
    client.close();
  }
};

export const doDeleteUserSelectionTree = async (userId, selectionId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selection = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne(
        { _id: selectionId },
        { userId: true, rootSelectionId: true, subscriptionIds: true },
      );
    const { rootSelectionId, subscriptionIds } = selection;
    if (!selection) throw new Error('Selection not found');
    if (selection.userId !== userId) throw new Error('not authorized');

    // get ids of all child selections
    const getChildSelectionIdsPipeline = [
      { $match: { _id: selectionId, userId } },
      {
        $graphLookup: {
          from: 'selection',
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
    const [selectionIdsObj] = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .aggregate(getChildSelectionIdsPipeline).toArray();
    const { selectionIds } = selectionIdsObj || { selectionIds: [] };
    selectionIds.push(selectionId);

    // remove selection with all child selection
    await doDeleteUserSelection(selectionIds);
    const [remainingMedia] = await client.db(process.env.DB_NAME).collection('mediumSelectionLinks').aggregate([
      { $match: { rootSelectionId } },
      {
        $group: {
          _id: null,
          mediaIds: { $addToSet: '$mediumId' },
        },
      },
    ]).toArray();
    const { mediaIds } = remainingMedia || { mediaIds: [] };
    await client.db(process.env.DB_NAME).collection('mediumSelectionLinks')
      .updateMany({
        _id: {
          $nin: mediaIds,
        },
        subscriptionIds: {
          $elemMatch: {
            $in: subscriptionIds,
          },
        },
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
