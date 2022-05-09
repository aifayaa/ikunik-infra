import { sendNotifications } from '../lib/sendNotifications';

export default async ({
  appId,
  queueId,
}) => {
  const extraResponseData = await sendNotifications(
    appId,
    queueId,
  );
  return ({ success: true, ...extraResponseData });
};
