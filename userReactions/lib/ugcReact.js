import { toggleReactionOn } from './setReactions';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_USER_GENERATED_CONTENTS,
} = mongoCollections;

export default async function ugcReact(appId, ugcId, userId, reaction) {
  const insertedReaction = await toggleReactionOn(
    appId,
    COLL_USER_GENERATED_CONTENTS,
    ugcId,
    userId,
    'reaction',
    reaction,
  );

  return ({ added: !!insertedReaction });
}
