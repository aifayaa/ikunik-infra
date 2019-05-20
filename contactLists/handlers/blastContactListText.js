import Lambda from 'aws-sdk/clients/lambda';
import phone from 'phone';
import getContactList from '../lib/getContactList';

export default async (event, context, callback) => {
  const {
    REGION,
    STAGE,
  } = process.env;

  const lambda = new Lambda({
    region: REGION,
  });

  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId, profileId } = event.requestContext.authorizer;
    const contactListId = event.pathParameters.id;
    const { message } = JSON.parse(event.body);
    const { contacts } = await getContactList(userId, profileId, contactListId, undefined, appId);
    const phones = contacts.map(contact => phone(contact.phone || contact.cleandedPhoneNumber)[0])
      .filter(phoneNumber => phoneNumber);
    const params = {
      FunctionName: `blast-${STAGE}-blastText`,
      Payload: JSON.stringify({
        phones,
        message,
        opts: { userId, listId: contactListId, appId },
      }),
    };
    const res = await lambda.invoke(params).promise();
    const response = {
      statusCode: 200,
      body: JSON.stringify(res),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
