import xmlParser from 'fast-xml-parser';
import get from 'lodash/get';
import each from 'lodash/each';

const flatify = (val) => {
  if (typeof val === 'object') {
    let newString = '';
    each(val, (value) => {
      newString = `${newString} ${flatify(value)}`;
    });
    return newString;
  }
  return val;
};

export default (xml, settings) => {
  const parsedXml = xmlParser.parse(xml);
  const infos = {};
  each(settings.infoPaths, (path, key) => {
    infos[key] = flatify(get(parsedXml, path));
  });
  return infos;
};
