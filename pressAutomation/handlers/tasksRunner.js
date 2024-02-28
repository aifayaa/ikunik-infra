/* eslint-disable import/no-relative-packages */
import tasksRunner from '../lib/tasksRunner';

export default async () => {
  try {
    const count = await tasksRunner();
    return `Executed ${count} tasks`;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Caught error :', e);
    return 'ERROR';
  }
};
