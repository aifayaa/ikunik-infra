export default (originalXml, { contentTag, tagsMap }) => {
  const xml = originalXml.match(new RegExp(`<${contentTag}>(.*?)</${contentTag}>`, 's'))[1];
  let newString = xml;
  Object.keys(tagsMap).forEach((key) => {
    // ensure no script is injected
    newString = newString.replace(/<script[^)]*>[^)]*<\/script>/gi, '');
    // replace tags
    newString = newString.replace(new RegExp(`<${key}>`, 'g'), `<${tagsMap[key]}>`)
      .replace(new RegExp(`</${key}>`, 'g'), `</${tagsMap[key]}>`)
      .replace(new RegExp(`<${key}/>`, 'g'), `<${tagsMap[key]}/>`);
  });
  return newString;
};
