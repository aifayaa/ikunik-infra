import { MongoClient, ObjectID } from 'mongodb';

const {
  MONGO_URL,
} = process.env;

// set parameters for MongoDb connect
MongoClient.connect = MongoClient.connect.bind(null, MONGO_URL, { useUnifiedTopology: true });

export default MongoClient;
export { ObjectID };
