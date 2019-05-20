import AWS from 'aws-sdk';
import shortid from 'shortid';

AWS.config.update({
  accessKeyId: process.env.DYNAMO_AWS_KEY,
  secretAccessKey: process.env.DYNAMO_AWS_SECRET,
});
const dynamoDB = new AWS.DynamoDB();

export default async ({ userId, contacts }) => {
  const putRequests = contacts.map(({
    firstname,
    lastname,
    phone,
    email,
  }) => ({
    PutRequest: {
      Item: {
        id: { S: shortid() },
        userId: { S: userId },
        firstname: { S: firstname },
        lastname: { S: lastname },
        phone: { S: phone },
        email: { S: email },
      },
    },
  }));

  const params = {
    RequestItems: {
      contacts: putRequests,
    },
  };
  await dynamoDB.batchWriteItem(params).promise();
};
