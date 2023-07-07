import { toggleReactionOn } from './setReactions';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_PRESS_ARTICLES,
} = mongoCollections;

export default async function pressArticleReact(appId, articleId, userId, reaction) {
  const insertedReaction = await toggleReactionOn(
    appId,
    COLL_PRESS_ARTICLES,
    articleId,
    userId,
    'reaction',
    reaction,
  );

  return ({ added: !!insertedReaction });
}
