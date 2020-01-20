import shortid from 'shortid';

export default () => {
  const id = shortid.generate();
  const charCodes = Array.prototype.map.call(id, (char) => char.charCodeAt(0));
  const integerId = charCodes.reduce((accumulator, currentValue) => `${accumulator}${currentValue}`);
  return integerId;
};
