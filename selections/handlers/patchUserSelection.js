import response from '../../libs/httpResponses/response';
import patchUserSelection from '../libs/patchUserSelection';
import generatePatchUserSelection from '../libs/generatePatchUserSelection';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbiden' });
  }
  try {
    const { selectionId } = event.pathParameters;
    const { contentIds, selectionIds, action, patch } = JSON.parse(event.body);
    if (
      (!contentIds && !selectionIds && !patch) ||
      ![undefined, 'replace', 'remove', 'add', 'patch'].includes(action)
    ) {
      throw new Error('malformed request');
    }
    let results;
    if (action === 'patch') {
      results = await patchUserSelection(selectionId, userId, appId, patch);
    } else {
      const modifier = await generatePatchUserSelection(
        selectionId,
        userId,
        contentIds,
        selectionIds,
        action,
      );
      results = await patchUserSelection(selectionId, userId, appId, modifier, true);
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
