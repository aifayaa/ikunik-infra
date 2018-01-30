import AWS from 'aws-sdk';
import shortid from 'shortid';

AWS.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
});

const dynamoDB = new AWS.DynamoDB();

const doImport = async ({ userId, contacts }) => {
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

export const handleImport = async (event, context, callback) => {
  try {
    const data = JSON.parse(event.body);
    await doImport(data);

    const response = { statusCode: 200 };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      message: e.message,
    };
    callback(null, response);
  }
};
