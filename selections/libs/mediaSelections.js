import { MongoClient } from 'mongodb';
import difference from 'lodash/difference';
import Lambda from 'aws-sdk/clients/lambda';

const lambda = new Lambda({
  region: process.env.REGION,
});

const checkDocuments = async (userId, mediaIds) => {
  // check args
  if (mediaIds && mediaIds.length > 0) {
    const params = {
      FunctionName: `media-${process.env.STAGE}-checkUserMedia`,
      Payload: JSON.stringify({ userId, mediaIds }),
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

export const doLinkMediaToSelection = async (userId, selectionId, mediaIds) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    checkDocuments(userId, mediaIds);
    const selectionFields = { rootSelectionId: true, subscriptionIds: true };
    const selection = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_SELECTIONS)
      .findOne({ _id: selectionId, userId }, selectionFields);
    if (!selection) throw new Error('selection not exists or not owned');
    const { rootSelectionId } = selection;
    const rootSelection = !rootSelectionId ? selection : await client.db(process.env.DB_NAME)
      .collection('selection')
      .findOne({ _id: rootSelectionId }, selectionFields);
    if (!rootSelection) throw new Error('rootSelection not found');
    const { subscriptionIds } = rootSelection;
    await Promise.all(mediaIds.map(mediumId =>
      client.db(process.env.DB_NAME)
        .collection('mediumSelectionLinks')
        .updateOne(
          { selectionId, mediumId },
          { $set: { selectionId, mediumId, rootSelectionId: rootSelection._id } },
          { upsert: true },
        )));
    const mediaModifier = { $addToSet: { subscriptionIds: { $each: subscriptionIds } } };
    await Promise.all([
      client.db(process.env.DB_NAME)
        .collection('audio').updateOne({ _id: { $in: mediaIds } }, mediaModifier),
      client.db(process.env.DB_NAME)
        .collection('video').updateOne({ _id: { $in: mediaIds } }, mediaModifier),
    ]);
  } finally {
    client.close();
  }
};

export const doUnlinkMediaFromSelection = async (userId, selectionId, mediaIds) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    checkDocuments(userId, mediaIds);
    const selectionFields = { rootSelectionId: true, subscriptionIds: true };
    const selection = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_SELECTIONS).findOne(
        { _id: selectionId, userId },
        selectionFields,
      );
    if (!selection) throw new Error('selection not exists or not owned');
    const { rootSelectionId } = selection;
    const rootSelection = !rootSelectionId ? selection : await client.db(process.env.DB_NAME)
      .collection('selection')
      .findOne({ _id: rootSelectionId }, selectionFields);
    if (!rootSelection) throw new Error('rootSelection not exists');
    const { subscriptionIds } = rootSelection;

    // Remove link between media and selection
    await Promise.all(mediaIds.map(mediumId =>
      client.db(process.env.DB_NAME)
        .collection('mediumSelectionLinks')
        .remove({ selectionId, mediumId }, true)));

    // Remove root selection subscription from media
    const remainingLinks = await client.db(process.env.DB_NAME).collection('mediumSelectionLinks').aggregate([
      { $match: { mediumId: { $in: mediaIds }, rootSelectionId } },
      { $group: { _id: '$mediumId' } },
    ]).toArray();
    const remainingIds = remainingLinks.map(item => item._id);
    const mediaIdsToRemove = difference(mediaIds, remainingIds);
    const mediaModifier = { $pull: { subscriptionIds: { $in: subscriptionIds } } };
    await Promise.all([
      client.db(process.env.DB_NAME)
        .collection('audio').update({ _id: { $in: mediaIdsToRemove } }, mediaModifier, { multi: true }),
      client.db(process.env.DB_NAME)
        .collection('video').update({ _id: { $in: mediaIdsToRemove } }, mediaModifier, { multi: true }),
    ]);
  } finally {
    client.close();
  }
};
