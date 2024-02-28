/* eslint-disable import/no-relative-packages */
import singleTaskRunner from '../lib/singleTaskRunner';

export default async (event) => {
  try {
    const { taskId } = event;
    await singleTaskRunner(taskId);
    return 'OK';
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Caught error :', e);
    return 'ERROR';
  }
};
