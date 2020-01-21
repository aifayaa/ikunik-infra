import response from '../libs/httpResponses/response';

export const handleGetAuthorize = () => new Promise((resolve) => resolve(response({ code: 200, message: 'ok' })));
