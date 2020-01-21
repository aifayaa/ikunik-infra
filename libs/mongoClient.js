import { MongoClient, ObjectID } from 'mongodb';

const {
  MONGO_URL,
} = process.env;

const DEFAULT_OPTS = {
  useUnifiedTopology: true,
};

const { connect } = MongoClient;
// set parameters for MongoDb connect
MongoClient.connect = (mongoURL, opts, cb) => connect(
  mongoURL || MONGO_URL,
  { ...DEFAULT_OPTS, ...opts },
  cb,
);

export default MongoClient;
export { ObjectID };
