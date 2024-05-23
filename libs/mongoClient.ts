/* eslint-disable import/no-relative-packages */
import {
  MongoCallback,
  MongoClient,
  MongoClientOptions,
  ObjectID,
} from 'mongodb';
import { CrowdaaError } from './httpResponses/CrowdaaError';
import {
  ERROR_TYPE_SETUP,
  MISSING_ENVIRONMENT_VARIABLE_CODE,
} from './httpResponses/errorCodes';

const { MONGO_URL } = process.env;

const DEFAULT_OPTS: MongoClientOptions = {
  useUnifiedTopology: true,
};

/**
 * See : https://dev.to/vladholubiev/i-wish-i-knew-how-to-use-mongodb-connection-in-aws-lambda-c46
 * to understand this code below and why we don't close connections
 */
const prevClients: { [key: string]: MongoClient | undefined } = {};

const { connect: originConnect } = MongoClient;

MongoClient.connect = async function connectMethodOverride(mongoUrl?: string) {
  const effectiveMongoUrl = mongoUrl
    ? mongoUrl
    : MONGO_URL
      ? MONGO_URL
      : undefined;

  if (!effectiveMongoUrl) {
    throw new CrowdaaError(
      ERROR_TYPE_SETUP,
      MISSING_ENVIRONMENT_VARIABLE_CODE,
      `Missing argument mongoUrl: ${mongoUrl}. Missing environment variable MONGO_URL: ${MONGO_URL}`,
      { httpCode: 500 }
    );
  }

  const connectArgs = JSON.stringify([effectiveMongoUrl, DEFAULT_OPTS]);

  const candidatClient = prevClients[connectArgs];
  if (candidatClient) {
    if (candidatClient.isConnected()) {
      return candidatClient;
    }
  }

  const client = await originConnect(effectiveMongoUrl, DEFAULT_OPTS);

  const originClose = client.close.bind(client);

  client.forceCloseThisConnectionNow = () => {
    originClose(true);
  };

  client.close = () => new Promise((resolve) => resolve());

  prevClients[connectArgs] = client;

  return client;
};

export default MongoClient;

export { ObjectID };
