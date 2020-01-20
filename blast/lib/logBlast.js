import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';

const {
  COLL_BLASTS,
  DB_NAME,
  REGION,
  STAGE,
} = process.env;

const lambda = new Lambda({
  region: REGION,
});

export default async (type, message, qte, { userId, listId, projectId, appId }) => {
  let client;
  let profileId;
  try {
    if (userId) {
      const res = await lambda.invoke({
        FunctionName: `users-${STAGE}-getProfile`,
        Payload: JSON.stringify({
          pathParameters: { id: userId },
          requestContext: { authorizer: { principalId: userId, appId } },
        }),
      }).promise();
      const { StatusCode, Payload } = res;
      if (StatusCode !== 200) throw new Error('failed to get profile');
      const { body } = JSON.parse(Payload);
      if (!body) throw new Error('wrong profile');
      profileId = JSON.parse(body)._id;
    }

    client = await MongoClient.connect();
    await client
      .db(DB_NAME)
      .collection(COLL_BLASTS)
      .insertOne({
        message,
        type,
        date: new Date(),
        fromList_ID: listId || null,
        fromProfil_ID: profileId || null,
        fromProject_ID: projectId || null,
        fromUser_ID: userId || null,
        numRecipients: Number(qte),
        appIds: appId ? [appId] : null,
      });
    return { profileId };
  } finally {
    client.close();
  }
};
