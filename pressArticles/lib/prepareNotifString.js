export default (text, length = 41) => {
  const prepared = text
    .replace(/[\n\r]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/, '');
  return `${prepared.substring(0, length)}...`;
};
