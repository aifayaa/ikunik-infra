import request from 'request-promise-native';

export default (userBadges, toCheckbadges, options) => {
  if (!toCheckbadges) {
    return (true);
  }
  if (toCheckbadges.list.length === 0) {
    return (true);
  }

  const userBadgesMap = userBadges.reduce((acc, perm) => {
    acc[perm.id] = true;
    return (acc);
  }, {});
  let valid = false;

  const promises = toCheckbadges.list.map((perm) => {
    if (perm.validationUrl) {
      const replacements = {
        APP_ID: options.appId,
        ARTICLE_ID: options.articleId,
        CATEGORY_ID: options.categoryId,
        USER_ID: options.userId,
      };
      const uri = perm.validationUrl.replace(
        /\{([A-Z_]+)\}/g,
        (_val, name) => (replacements[name] || 'null'),
      );
      return (async () => {
        const params = {
          method: 'GET',
          uri,
        };

        try {
          await request(params);
          valid = true;
        } catch (e) {
          /* Do nothing */
        }
      });
    }

    if (userBadgesMap[perm.id]) {
      valid = true;
    }

    return (Promise.resolve(null));
  });

  Promise.all(promises);

  return (valid);
};
