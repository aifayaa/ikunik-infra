/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { intlInit, formatMessage } from '../../libs/intl/intl';
import {
  ForumCategoryType,
  ForumTopicReplyType,
  ForumTopicType,
} from './forumEntities';
import { UserType } from '@users/lib/userEntity';
import { AppType } from '@apps/lib/appEntity';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import getAppAdmins from '../../apps/lib/getAppAdmins';
import { objGet } from '../../libs/utils';

const { REACT_APP_DASHBOARD_URL } = process.env;

const { COLL_APPS, COLL_USERS, COLL_FORUM_CATEGORIES, COLL_FORUM_TOPICS } =
  mongoCollections;

type PartialUserProfileType = Pick<UserType, 'profile'>;

async function sendEmailToAppAdmins(
  lang: string,
  subject: string,
  body: string,
  appId: string
) {
  const client = await MongoClient.connect();
  try {
    const admins = await getAppAdmins(appId, {
      userProjection: { 'emails.address': 1 },
      includeSuperAdmins: true,
    });
    const emails = admins
      .map((admin) => objGet(admin, 'emails.0.address'))
      .filter((x) => x);
    const promises = emails.map((email) => {
      /* in case of error, ignore it, just try with best effort */
      try {
        return sendEmailTemplate(lang, 'clients', email, subject, body);
      } catch (e) {
        console.error(e);
        return null;
      }
    });
    await Promise.all(promises);
  } finally {
    await client.close();
  }
}

function formatDateTime(date: Date, lang: string) {
  const LANGS: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
  };

  return date.toLocaleDateString(LANGS[lang] || 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function forumSendReportTopicEmail(
  userId: string,
  topic: ForumTopicType,
  reason: string,
  lang: string
) {
  const client = await MongoClient.connect();

  try {
    const { appId, categoryId } = topic;
    const db = client.db();

    const [reportingUser, app, category] = await Promise.all([
      db.collection(COLL_USERS).findOne(
        {
          _id: userId,
          appId,
        },
        { projection: { 'profile.username': true } }
      ) as Promise<UserType | null>,
      db.collection(COLL_APPS).findOne(
        {
          _id: appId,
        },
        { projection: { name: true } }
      ) as Promise<AppType | null>,
      db.collection(COLL_FORUM_CATEGORIES).findOne({
        _id: categoryId,
        appId,
      }) as Promise<ForumCategoryType | null>,
    ]);

    if (!reportingUser || !app || !category) {
      return;
    }

    let contentAuthor = (await db.collection(COLL_USERS).findOne({
      _id: topic.createdBy,
      appId,
    })) as PartialUserProfileType | null;

    if (!contentAuthor) {
      contentAuthor = { profile: { username: '' } };
    }

    intlInit(lang);

    const subject = formatMessage(`forum:reported_topic_email.title`, {
      appName: app.name,
      category,
    });

    const body = formatMessage(`forum:reported_topic_email.html`, {
      userId: reportingUser._id,
      username: reportingUser.profile.username,
      appName: app.name,
      createdAt: formatDateTime(topic.createdAt, lang),
      topic,
      category,
      reportingUser,
      contentAuthor,
      reason,
      ugcModerationUrl: `${REACT_APP_DASHBOARD_URL}/apps/${appId}/forum/moderation/topics/${topic._id}`,
    });

    await sendEmailToAppAdmins(lang, subject, body, appId);
  } finally {
    await client.close();
  }
}

export async function forumSendReportTopicReplyEmail(
  userId: string,
  reply: ForumTopicReplyType,
  reason: string,
  lang: string
) {
  const client = await MongoClient.connect();

  try {
    const { appId, categoryId, topicId } = reply;
    const db = client.db();

    const [reportingUser, app, category, topic] = await Promise.all([
      db.collection(COLL_USERS).findOne(
        {
          _id: userId,
          appId,
        },
        { projection: { 'profile.username': true } }
      ) as Promise<UserType | null>,
      db.collection(COLL_APPS).findOne(
        {
          _id: appId,
        },
        { projection: { name: true } }
      ) as Promise<AppType | null>,
      db.collection(COLL_FORUM_CATEGORIES).findOne({
        _id: categoryId,
        appId,
      }) as Promise<ForumCategoryType | null>,
      db.collection(COLL_FORUM_TOPICS).findOne({
        _id: topicId,
        appId,
      }) as Promise<ForumTopicType | null>,
    ]);

    if (!reportingUser || !app || !category || !topic) {
      return;
    }

    let contentAuthor = (await db.collection(COLL_USERS).findOne({
      _id: topic.createdBy,
      appId,
    })) as PartialUserProfileType | null;

    if (!contentAuthor) {
      contentAuthor = { profile: { username: '' } };
    }

    intlInit(lang);

    const subject = formatMessage(`forum:reported_topic_reply_email.title`, {
      appName: app.name,
      category,
    });

    const body = formatMessage(`forum:reported_topic_reply_email.html`, {
      userId: reportingUser._id,
      username: reportingUser.profile.username,
      appName: app.name,
      createdAt: formatDateTime(reply.createdAt, lang),
      topic,
      reply,
      category,
      reportingUser,
      contentAuthor,
      reason,
      ugcModerationUrl: `${REACT_APP_DASHBOARD_URL}/apps/${appId}/forum/moderation/replies/${topic._id}`,
    });

    await sendEmailToAppAdmins(lang, subject, body, appId);
  } finally {
    await client.close();
  }
}
