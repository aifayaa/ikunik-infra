import sinon from 'sinon';

export default (response) => {
  const toArray = sinon.spy(() => Promise.resolve(response));
  const aggregate = sinon.spy(() => ({
    toArray,
  }));
  const find = sinon.spy(() => ({
    toArray,
  }));
  const insertOne = sinon.spy(() => true);
  const findOne = sinon.spy(() => response);
  const updateOne = sinon.spy(() => true);
  const updateMany = sinon.spy(() => true);
  const deleteOne = sinon.spy(() => true);
  const deleteMany = sinon.spy(() => true);
  const collection = sinon.spy(() => ({
    aggregate,
    insertOne,
    findOne,
    find,
    updateOne,
    updateMany,
    deleteOne,
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
    updateMany,
    updateOne,
    insertOne,
    findOne,
    find,
    deleteOne,
    deleteMany,
    startSession,
    endSession,
    startTransaction,
    commitTransaction,
  };
};
