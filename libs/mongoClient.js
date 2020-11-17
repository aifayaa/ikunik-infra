import { MongoClient, ObjectID } from 'mongodb';

const {
  MONGO_URL,
} = process.env;

const DEFAULT_OPTS = {
  useUnifiedTopology: true,
  autoReconnect: true,
};

/**
 * See : https://dev.to/vladholubiev/i-wish-i-knew-how-to-use-mongodb-connection-in-aws-lambda-c46
 * to understand this code below and why we don't close connections
 */
const prevClients = {};

const { connect } = MongoClient;
// set parameters for MongoDb connect
MongoClient.connect = async function connectOverload(mongoURL, opts, cb) {
  const connectArgs = JSON.stringify([mongoURL, opts]);
  if (prevClients[connectArgs] && prevClients[connectArgs].isConnected()) {
    return (prevClients[connectArgs]);
  }

  const client = await connect(
    mongoURL || MONGO_URL,
    { ...DEFAULT_OPTS, ...opts },
    cb,
  );

  client.close = function closeOverload() {
    /* Do nothing, let connections timeout */
  };

  prevClients[connectArgs] = client;

  return (client);
};

export default MongoClient;
export { ObjectID };
