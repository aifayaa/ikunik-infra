import postUserGeneratedContents from '../lib/postUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import pathToCollection from '../../libs/collections/pathToCollection';
import AVAILABLE_TYPES from '../userGeneratedContentsTypes.json';
import sendEmailToAdmin from '../lib/sendEmailToAdmin';
import emailTemplate from '../lib/emailUgcNotifyTemplate';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  /* Get collection from resource path */
  let parentCollection = pathToCollection(event.requestContext.resourcePath);

  if (!event.body) {
    throw new Error('missing_payload');
  }
  try {
    const bodyParsed = JSON.parse(event.body);
    const {
      parentId,
      type,
      data,
    } = bodyParsed;

    if (!parentId) {
      parentCollection = '';
    }

    /* If unspecified, use the same as parent for the rootParent */
    const rootParentId = bodyParsed.rootParentId || parentId;
    const rootParentCollection = bodyParsed.rootParentCollection || parentCollection;

    if (!type || !data) {
      throw new Error('Missing arguments');
    }

    [
      appId,
      parentId,
      parentCollection,
      rootParentId,
      rootParentCollection,
      userId,
      type,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    if (typeof AVAILABLE_TYPES[type] === 'undefined') {
      throw new Error('Wrong type value');
    }

    const results = await postUserGeneratedContents(
      appId,
      parentId,
      parentCollection,
      rootParentId || parentId,
      rootParentCollection || parentCollection,
      userId,
      type,
      data,
    );

    /*
      try to send email to appAdmin
      if it failled for any reason just ignore error
      we don't want this request to be concidered as failed
      since content has successfully been edited

      This portion of code could be externalised in an
      other serverless function which could be called without
      waiting Promise to be resolved to permit a quick response
      to the requester
    */
    try {
      const { subject, body } = await emailTemplate(
        userId,
        appId,
        { contentId: results._id, data },
      );
      await sendEmailToAdmin(subject, body, appId);
    } catch (e) {
      console.log('Error when sending mail to admin', e);
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
