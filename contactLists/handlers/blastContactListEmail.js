import Lambda from 'aws-sdk/clients/lambda';
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
    const contactListId = event.pathParameters.id;
    const { appId, profileId } = event.requestContext.authorizer;
    const { subject, template } = JSON.parse(event.body);
    let { contacts } = await getContactList(userId, profileId, contactListId, undefined, appId);
    contacts = contacts.map(contact => ({ email: contact.email, name: contact.name }))
      .filter(contact => contact.email);
    const params = {
      FunctionName: `blast-${STAGE}-blastEmail`,
      Payload: JSON.stringify({
        contacts,
        subject,
        template,
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
