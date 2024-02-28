/* eslint-disable import/no-relative-packages */
import { setReactionOn } from './setReactions';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_ARTICLES } = mongoCollections;

export default async function pressArticleView(appId, articleId, userId) {
  const reaction = await setReactionOn(
    appId,
    COLL_PRESS_ARTICLES,
    articleId,
    userId,
    'views',
    'views'
  );

  return { viewed: !!reaction };
}
