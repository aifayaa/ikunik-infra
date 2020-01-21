import { MongoClient, ObjectID } from 'mongodb';

const {
  MONGO_URL,
} = process.env;

const DEFAULT_OPTS = {
  useUnifiedTopology: true,
};

// set parameters for MongoDb connect
MongoClient.connect = (mongoURL, opts, cb) => MongoClient.connect(
  mongoURL || MONGO_URL,
  { DEFAULT_OPTS, ...opts },
  cb,
);

export default MongoClient;
export { ObjectID };
