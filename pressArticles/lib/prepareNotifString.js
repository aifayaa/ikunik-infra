export default (text, length = 116, ellipsis = false) => {
  const preparedText = text
    /* Replace new lines with whitespaces */
    .replace(/[\n\r]+/g, ' ')

    /* Remove successive whitespaces */
    .replace(/\s{2,}/g, ' ')

    /* Remove trailing whitespace at the beginning and at the end */
    .replace(/^\s+|\s+$/, '');

  /* Cut string at size but preserve word */
  const cutRegex = new RegExp(`^(.{${length}}[^\\s]*).*`, 'g');
  const cuttedText = preparedText.replace(cutRegex, '$1');

  return `${cuttedText}${ellipsis ? '...' : ''}`;
};
