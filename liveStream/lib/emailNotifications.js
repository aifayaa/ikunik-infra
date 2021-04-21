import MongoClient from '../../libs/mongoClient';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const {
  COLL_APPS,
  COLL_LIVE_STREAM,
  COLL_PERM_GROUPS,
  COLL_USERS,
  DB_NAME,
  REACT_APP_PRESS_SERVICE_URL,
} = process.env;

const LANG = 'en';
const ALWAYS_MAIL_TO = ['support@crowdaa.com'];

/** @TODO Maybe add specific permissions for live streams? */
const PERMISSION = 'pressArticles_all';

async function fetchEmailsData(liveStreamId) {
  const client = await MongoClient.connect();
  try {
    const [liveStream] = await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .aggregate([
        {
          $match: {
            _id: liveStreamId,
          },
        },
        {
          $lookup: {
            from: COLL_APPS,
            localField: 'appId',
            foreignField: '_id',
            as: 'app',
          },
        },
      ]).toArray();
    const { app: [app], appId } = liveStream;

    const [result] = await client
      .db(DB_NAME)
      .collection(COLL_PERM_GROUPS)
      .aggregate([
        {
          $match: {
            appId,
            [`perms.${PERMISSION}`]: true,
          },
        },
        {
          $lookup: {
            from: COLL_USERS,
            localField: '_id',
            foreignField: 'permGroupIds',
            as: 'users',
          },
        },
        {
          $unwind: {
            path: '$users',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $replaceRoot: { newRoot: '$users' },
        },
        {
          $project: {
            'emails.address': true,
          },
        },
        {
          $unwind: {
            path: '$emails',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $group: {
            _id: '$emails.address',
          },
        },
        {
          $group: {
            _id: null,
            emails: { $push: '$_id' },
          },
        },
      ]).toArray();
    const { emails = [] } = result || {};

    return ({
      liveStream,
      app,
      emails,
    });
  } finally {
    client.close();
  }
}

async function sendEmailsTo(lang, template, emails, subject, html) {
  const promises = emails.concat(ALWAYS_MAIL_TO).map((email) => (
    sendEmailTemplate(lang, template, email, subject, html)
  ));

  await Promise.allSettled(promises);
}

export const notifyAdminsOfStart = async (liveStreamId, scheduled, error = false) => {
  const {
    app,
    emails,
    liveStream,
  } = await fetchEmailsData(liveStreamId);
  let mailTemplate;

  intlInit(LANG);

  if (scheduled) {
    if (error) {
      mailTemplate = 'schedule_error';
    } else {
      mailTemplate = 'schedule_success';
    }
  } else if (error) {
    mailTemplate = 'start_error';
  } else {
    mailTemplate = 'start_success';
  }

  /* Prepare data for email */
  const [
    yyyy,
    mm,
    dd,
    HH,
    MM,
    SS,
  ] = liveStream.startDateTime.toISOString().split(/[^0-9]+/g);
  const liveStreamUrl = `${REACT_APP_PRESS_SERVICE_URL}/${app._id}/liveStream/${liveStreamId}/view`;
  const liveStreamStartDate = formatMessage('general:the_date_at_time', { yyyy, mm, dd, HH, MM, SS });
  const subject = formatMessage(`liveStream:${mailTemplate}.title`, { appName: app.name, liveStreamName: liveStream.displayName });

  /* send token by email to user */
  const html = formatMessage(`liveStream:${mailTemplate}.html`, {
    appName: app.name,
    liveStreamName: liveStream.displayName,
    liveStreamStartDate,
    liveStreamUrl,
    error,
  });

  await sendEmailsTo(LANG, 'clients', emails, subject, html);
};

export const notifyAdminsOfStop = async (liveStreamId, error = false) => {
  if (!error) {
    return;
  }

  const {
    app,
    emails,
    liveStream,
  } = await fetchEmailsData(liveStreamId);

  intlInit(LANG);

  /* Prepare data for email */
  const [
    yyyy,
    mm,
    dd,
    HH,
    MM,
    SS,
  ] = liveStream.endDateTime.toISOString().split(/[^0-9]+/g);
  const liveStreamUrl = `${REACT_APP_PRESS_SERVICE_URL}/${app._id}/liveStream/${liveStreamId}/view`;
  const liveStreamEndDate = formatMessage('general:the_date_at_time', { yyyy, mm, dd, HH, MM, SS });
  const subject = formatMessage('liveStream:end_success.title', { appName: app.name, liveStreamName: liveStream.displayName });

  /* send token by email to user */
  const html = formatMessage('liveStream:end_success.html', {
    appName: app.name,
    liveStreamName: liveStream.displayName,
    liveStreamEndDate,
    liveStreamUrl,
    error,
  });

  await sendEmailsTo(LANG, 'clients', emails, subject, html);
};
