import sinon from 'sinon';

export default (...responses) => {
  let responseCount = -1;
  const forEach = sinon.spy(
    (cb) => {
      responseCount += 1;
      return Promise.resolve(cb(responses[responseCount]));
    },
  );
  const toArray = sinon.spy(
    () => {
      responseCount += 1;
      return Promise.resolve(responses[responseCount]);
    },
  );
  const aggregate = sinon.spy(() => ({
    toArray,
  }));
  const count = sinon.spy(() => {
    responseCount += 1;
    return Promise.resolve(responses[responseCount].length || 0);
  });
  const find = sinon.spy(() => ({
    toArray,
    count,
    forEach,
  }));
  const insertOne = sinon.spy(() => true);
  const findOne = sinon.spy(() => {
    responseCount += 1;
    return responses[responseCount];
  });
  const updateOne = sinon.spy(() => true);
  const updateMany = sinon.spy(() => true);
  const deleteOne = sinon.spy(() => true);
  const removeOne = sinon.spy(() => true);
  const deleteMany = sinon.spy(() => true);
  const collection = sinon.spy(() => ({
    aggregate,
    insertOne,
    findOne,
    find,
    updateOne,
    updateMany,
    deleteOne,
    removeOne,
    deleteMany,
  }));
  const db = sinon.spy(() => ({ collection }));
  const close = sinon.spy(() => true);
  const endSession = sinon.spy(() => true);
  const startTransaction = sinon.spy(() => true);
  const commitTransaction = sinon.spy(() => true);
  const startSession = sinon.spy(() => ({
    endSession,
    startTransaction,
    commitTransaction,
  }));

  return {
    db,
    close,
    collection,
    aggregate,
    toArray,
    forEach,
    updateMany,
    updateOne,
    insertOne,
    findOne,
    find,
    deleteOne,
    removeOne,
    deleteMany,
    startSession,
    endSession,
    startTransaction,
    commitTransaction,
  };
};
