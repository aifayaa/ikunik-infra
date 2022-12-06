import importContacts from '../lib/importContacts';
import response from '../../libs/httpResponses/response';

export const handleImport = async (event) => {
  try {
    const data = JSON.parse(event.body);
    await importContacts(data);
    return response({ code: 200, body: 'ok' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
