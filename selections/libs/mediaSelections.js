import difference from 'lodash/difference';
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';

const {
  REGION,
  STAGE,
  COLL_AUDIOS,
  COLL_SELECTIONS,
  COLL_MEDIUM_SELECTION_LINKS,
  COLL_VIDEOS,
  DB_NAME,
} = process.env;

const lambda = new Lambda({
  region: REGION,
});

const checkDocuments = async (userId, mediaIds, appId) => {
  // check args
  if (mediaIds && mediaIds.length > 0) {
    const params = {
      FunctionName: `media-${STAGE}-checkUserMedia`,
      Payload: JSON.stringify({ userId, appId, mediaIds }),
    };
    const { Payload } = await lambda.invoke(params).promise();
    const res = JSON.parse(Payload);
    if (res.statusCode !== 200) {
      throw new Error(`checkUserMedia handler failed: ${res.body}`);
    }
    if (res.body !== 'true') throw new Error('bad media arguments');
  }
  return null;
};

export const doLinkMediaToSelection = async (userId, selectionId, mediaIds, appId) => {
  const client = await MongoClient.connect();
  try {
    checkDocuments(userId, mediaIds);
    const selectionFields = { rootSelectionId: true, subscriptionIds: true };
    const selection = await client.db(DB_NAME)
      .collection(COLL_SELECTIONS)
      .findOne({
        _id: selectionId,
        userId,
        appId,
      }, selectionFields);
    if (!selection) throw new Error('selection not exists or not owned');
    const { rootSelectionId } = selection;
    const rootSelection = !rootSelectionId ? selection : await client.db(DB_NAME)
      .collection(COLL_SELECTIONS)
      .findOne({
        _id: rootSelectionId,
        appId,
      }, selectionFields);
    if (!rootSelection) throw new Error('rootSelection not found');
    const { subscriptionIds } = rootSelection;
    await Promise.all(mediaIds.map((mediumId) => client.db(DB_NAME)
      .collection(COLL_MEDIUM_SELECTION_LINKS)
      .updateOne(
        {
          selectionId,
          mediumId,
          appId,
        },
        { $set: { selectionId, mediumId, rootSelectionId: rootSelection._id } },
        { upsert: true },
      )));
    const mediaModifier = { $addToSet: { subscriptionIds: { $each: subscriptionIds } } };
    await Promise.all([
      client
        .db(DB_NAME)
        .collection(COLL_AUDIOS)
        .updateOne({
          _id: { $in: mediaIds },
          appId,
        }, mediaModifier),
      client
        .db(DB_NAME)
        .collection(COLL_VIDEOS)
        .updateOne({
          _id: { $in: mediaIds },
          appId,
        }, mediaModifier),
    ]);
  } finally {
    client.close();
  }
};

export const doUnlinkMediaFromSelection = async (userId, selectionId, mediaIds, appId) => {
  const client = await MongoClient.connect();
  try {
    checkDocuments(userId, mediaIds, appId);
    const selectionFields = { rootSelectionId: true, subscriptionIds: true };
    const selection = await client.db(DB_NAME)
      .collection(COLL_SELECTIONS).findOne(
        {
          _id: selectionId,
          userId,
          appId,
        },
        selectionFields,
      );
    if (!selection) throw new Error('selection not exists or not owned');
    const { rootSelectionId } = selection;
    const rootSelection = !rootSelectionId ? selection : await client.db(DB_NAME)
      .collection(COLL_SELECTIONS)
      .findOne({
        _id: rootSelectionId,
        appId,
      }, selectionFields);
    if (!rootSelection) throw new Error('rootSelection not exists');
    const { subscriptionIds } = rootSelection;

    // Remove link between media and selection
    await Promise.all(mediaIds.map((mediumId) => client.db(DB_NAME)
      .collection(COLL_MEDIUM_SELECTION_LINKS)
      .remove({
        selectionId,
        mediumId,
        appId,
      }, true)));

    // Remove root selection subscription from media
    const remainingLinks = await client
      .db(DB_NAME)
      .collection(COLL_MEDIUM_SELECTION_LINKS).aggregate([
        {
          $match: {
            mediumId: { $in: mediaIds },
            rootSelectionId,
            appId,
          },
        },
        { $group: { _id: '$mediumId' } },
      ]).toArray();
    const remainingIds = remainingLinks.map((item) => item._id);
    const mediaIdsToRemove = difference(mediaIds, remainingIds);
    const mediaModifier = { $pull: { subscriptionIds: { $in: subscriptionIds } } };
    await Promise.all([
      client
        .db(DB_NAME)
        .collection(COLL_AUDIOS)
        .update({
          _id: { $in: mediaIdsToRemove },
          appId,
        }, mediaModifier, { multi: true }),
      client
        .db(DB_NAME)
        .collection(COLL_VIDEOS)
        .update({
          _id: { $in: mediaIdsToRemove },
          appId,
        }, mediaModifier, { multi: true }),
    ]);
  } finally {
    client.close();
  }
};
