/* eslint-disable import/no-relative-packages */
import { setReactionOn } from './setReactions';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export default async function ugcView(appId, articleId, userId) {
  const reaction = await setReactionOn(
    appId,
    COLL_USER_GENERATED_CONTENTS,
    articleId,
    userId,
    'views',
    'views'
  );

  return { viewed: !!reaction };
}
