/* eslint-disable import/no-relative-packages */
export default (originalXml, { contentTag, tagsMap, removeTags }) => {
  const xml = originalXml.match(
    new RegExp(`<${contentTag}>(.*?)</${contentTag}>`, 's')
  )[1];
  let newString = xml;
  Object.keys(removeTags).forEach((key) => {
    if (removeTags[key]) {
      newString = newString.replace(
        new RegExp(`<${key}[^)]*>[^)]*</${key}>`, 'gi'),
        ''
      );
    }
  });
  Object.keys(tagsMap).forEach((key) => {
    // ensure no script is injected
    newString = newString.replace(/<script[^)]*>[^)]*<\/script>/gi, '');
    // replace tags
    newString = newString
      .replace(new RegExp(`<${key}>`, 'g'), `<${tagsMap[key]}>`)
      .replace(new RegExp(`</${key}>`, 'g'), `</${tagsMap[key]}>`)
      .replace(new RegExp(`<${key}/>`, 'g'), `<${tagsMap[key]}/>`);
  });
  return newString;
};
