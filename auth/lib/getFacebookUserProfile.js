import request from 'request-promise-native';

/* get userInfo from facebookGraphAPI */
export const getFacebookUserProfile = async (fbUserId, token) => {
  const fields = [
    'id',
    'name',
    'email',
    'link',
    'first_name',
    'last_name',
    'gender',
  ];
  const fieldsString = fields.reduce((acc, curr) => `${acc},${curr}`); // works only if more than one field

  const userInfo = await request.get({
    url:
      `https://graph.facebook.com/v3.3/${fbUserId}?` +
      `access_token=${token}` +
      `&fields=${fieldsString}`,
  });

  const parsedUserInfo = JSON.parse(userInfo);
  const userProfile = {};
  fields.forEach((field) => {
    if (field !== undefined && typeof parsedUserInfo[field] === 'string') {
      userProfile[field] = parsedUserInfo[field];
    }
  });
  return userProfile;
};
