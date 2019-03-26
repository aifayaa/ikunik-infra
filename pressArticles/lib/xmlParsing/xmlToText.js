import sax from 'sax';

export default (xml, { contentTag }) => {
  const xmlContent = xml.match(new RegExp(`<${contentTag}>(.*?)</${contentTag}>`, 's'))[1];
  const parser = sax.parser();
  let output = '';
  parser.ontext = (text) => {
    output += `${text} `;
  };
  parser.write(`<xml>${xmlContent}<xml>`).close();
  return output;
};
