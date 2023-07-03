import MongoClient from '../../libs/mongoClient';
import getDBCounters from '../../counters/lib/getDBCounters';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';

const {
  COLL_APPS,
  COLL_PRESS_ARTICLES,
  COLL_USER_REACTIONS,
} = mongoCollections;

const defaultReactions = [
  'like',
  'celebrate',
  'support',
  'love',
  'insightful',
  'funny',
  '@total',
  '@views',
];

export default async function pressArticleGetReactions(appId, articleId, reactionsToReturn) {
  const client = await MongoClient.connect();
  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId });

    const appReactions = objGet(app, 'settings.press.env.reactions', defaultReactions);
    if (!reactionsToReturn || reactionsToReturn.length === 0) {
      reactionsToReturn = defaultReactions;
    }

    const queries = reactionsToReturn
      .filter((reaction) => (appReactions.indexOf(reaction) >= 0))
      .reduce(
        (acc, reactionName) => {
          acc[reactionName] = {
            appId,
            type: `pressArticle-reaction-${reactionName}`,
            name: articleId,
            updateQuery: {
              collection: COLL_USER_REACTIONS,
              pipeline: [
                {
                  $match: {
                    appId,
                    targetCollection: COLL_PRESS_ARTICLES,
                    targetId: articleId,
                    reactionType: 'reaction',
                    reactionName: `reaction-${reactionName}`,
                  },
                },
                {
                  $count: 'total',
                },
              ],
              outputField: 'total',
            },
          };

          if (reactionName === '@views') {
            acc[reactionName].updateQuery.pipeline[0].$match.reactionType = 'views';
            acc[reactionName].updateQuery.pipeline[0].$match.reactionName = 'views';
          } else if (reactionName === '@total') {
            delete acc[reactionName].updateQuery.pipeline[0].$match.reactionName;
          }

          return (acc);
        },
        {},
      );

    const counters = await getDBCounters(queries, { appId });

    return (counters);
  } finally {
    client.close();
  }
}
