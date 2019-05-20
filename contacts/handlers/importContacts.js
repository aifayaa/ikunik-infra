import importContacts from '../lib/importContacts';
import response from '../../libs/httpResponses/response';

export const handleImport = async (event, _context, callback) => {
  try {
    const data = JSON.parse(event.body);
    await importContacts(data);
    callback(null, response({ code: 200, body: 'ok' }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
