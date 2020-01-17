import { MongoClient } from 'mongodb';
import Lambda from 'aws-sdk/clients/lambda';
import checkSelectionsOwner from './checkSelectionsOwner';
import queryReplace from './queryReplace';

const {
  COLL_SELECTIONS,
  DB_NAME,
  MONGO_URL,
  REGION,
  STAGE,
} = process.env;

const lambda = new Lambda({
  region: REGION,
});

export default async (
  selectionId,
  userId,
  appId,
  contentIds,
  selectionIds,
  action = 'replace',
) => {
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
  try {
    if (selectionIds && selectionIds.length > 0) {
      const checked = await checkSelectionsOwner(selectionIds, userId);
      if (!checked) throw new Error('bad selections arguments');
    }
    if (contentIds && contentIds.length > 0) {
      const params = {
        FunctionName: `media-${STAGE}-checkUserMedia`,
        Payload: JSON.stringify({ userId, appId, mediaIds: contentIds }),
      };
      const { Payload } = await lambda.invoke(params).promise();
      const res = JSON.parse(Payload);
      if (res.statusCode !== 200) {
        throw new Error(`checkUserMedia handler failed: ${res.body}`);
      }
      if (res.body !== 'true') throw new Error('bad media arguments');
    }

    let modifier = {};
    const selection =
      action !== 'replace'
        ? await client
          .db(DB_NAME)
          .collection(COLL_SELECTIONS)
          .findOne({
            _id: selectionId,
            userId,
            appIds: { $elemMatch: { $eq: appId } },
          })
        : null;
    const selectionFindQuery =
      (selection && selection.selectionFindQuery && JSON.parse(selection.selectionFindQuery)) ||
      (selectionIds && { selectionFindQuery: { _id: { $in: [] } } });

    selectionFindQuery.appIds = { $elemMatch: { $eq: appId } };
    queryReplace(selectionFindQuery);
    if (!selectionFindQuery._id) selectionFindQuery._id = { $in: [] };
    if (!selectionFindQuery._id.$in) selectionFindQuery._id.$in = [];
    delete selectionFindQuery._id.$exists;
    switch (action) {
      case 'remove': {
        if (contentIds) {
          selectionFindQuery._id.$in =
            selectionFindQuery._id.$in.filter(item => !contentIds.includes(item));
          modifier.selectionFindQuery = JSON.stringify(selectionFindQuery);
          modifier = { $set: modifier };
        }
        if (selectionIds) {
          modifier.$pull = {
            selectionIds: {
              $in: selectionIds,
            },
          };
        }
        break;
      }
      case 'add': {
        if (contentIds) {
          Array.prototype.push.apply(selectionFindQuery._id.$in, contentIds);
          selectionFindQuery._id.$in.filter = [...new Set(selectionFindQuery._id.$in)];
          modifier.selectionFindQuery = JSON.stringify(selectionFindQuery);
          modifier = { $set: modifier };
        }
        if (selectionIds) {
          modifier.$addToSet = {
            selectionIds: {
              $each: selectionIds,
            },
          };
        }
        break;
      }
      case 'replace':
      default: {
        if (contentIds) {
          modifier.selectionFindQuery = `{"_id": {"$in":["${contentIds.join('","')}"]}}`;
        }
        if (selectionIds) {
          modifier.selectionIds = selectionIds;
        }
        modifier = { $set: modifier };
      }
    }
    return modifier;
  } finally {
    client.close();
  }
};
