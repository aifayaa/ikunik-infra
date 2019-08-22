/* Collections from environment */
const {
  COLL_PRESS_ARTICLES,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

/* Translate path to collections */
const translationArray = {
  'press/articles': COLL_PRESS_ARTICLES,
};

export default (resourcePath) => {
  /* Filter out parameters in brackets, 'userGeneratedContents' and trailing slash
   *  from the path before getting collection from it */
  const resourcePathSplitted = resourcePath.split('/');
  const pathFiltered = resourcePathSplitted.filter(item => item && item !== 'userGeneratedContents' && !item.match(/{.*}/));
  const path = pathFiltered.join('/');
  return translationArray[path] || COLL_USER_GENERATED_CONTENTS;
};
