/* eslint-disable import/no-relative-packages */
import { APIGateway } from 'aws-sdk';
import uuid from 'uuid';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

const apiGateway = new APIGateway();

export default async (
  name,
  userId,
  { protocol: inputProtocol = null } = {}
) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();

    const params = {
      name: `${name}-${new ObjectID().toString()}`,
    };
    const apiKey = await apiGateway.createApiKey(params).promise();
    const key = apiKey.value;
    const appId = uuid.v4();

    const protocol =
      inputProtocol || `crowdaa${new ObjectID().toString()}protocol`;

    const toInsert = {
      _id: appId,
      key,
      name,
      owners: [userId],
      settings: {},
      protocol,
    };
    await db.collection(COLL_APPS).insertOne(toInsert);

    return toInsert;
  } finally {
    client.close();
  }
};
