/* eslint-disable import/no-relative-packages */
import getAppAdmins from '../lib/getAppAdmins';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { APIGatewayProxyEvent } from 'aws-lambda';

type UserItemType = {
  _id: string;
  emails: [{ address: string }];
  profile: {
    firstname: string;
    lastname: string;
  };
};

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const rawAdmins = (await getAppAdmins(appId)) as [UserItemType];

    const admins = rawAdmins.map((user) => ({
      _id: user._id,
      email: user.emails[0].address,
      firstname: user.profile.firstname,
      lastname: user.profile.lastname,
    }));
    return response({ code: 200, body: admins });
  } catch (exception) {
    return handleException(exception);
  }
};
