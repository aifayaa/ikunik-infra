import MongoClient from '../../libs/mongoClient';

export default async (selectionId, userId, appId, patch, noCheck) => {
  if (!noCheck) {
    const allowedOperations = ['$set'];
    const allowedFields = ['selectionName', 'isWebPublished', 'isMobilePublished'];
    Object.keys(patch).forEach((key) => {
      if (!allowedOperations.includes(key)) {
        throw new Error('operation not allowed');
      }
      Object.keys(patch[key]).forEach((fKey) => {
        if (!allowedFields.includes(fKey)) {
          throw new Error('operation not allowed');
        }
      });
    });
  }

  // modify selectionDisplayName with selectionName
  if (patch.$set.selectionName) patch.$set.selectionDisplayName = patch.$set.selectionName;

  const client = await MongoClient.connect();
  try {
    return await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SELECTIONS)
      .findOneAndUpdate({
        _id: selectionId,
        userId,
        appIds: appId,
      }, patch, { returnOriginal: false });
  } finally {
    client.close();
  }
};
