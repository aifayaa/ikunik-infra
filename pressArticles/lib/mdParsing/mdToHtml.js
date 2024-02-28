/* eslint-disable import/no-relative-packages */
import showdown from 'showdown';

const converter = new showdown.Converter({
  noHeaderId: true,
  tables: true, // enable usage of tables
});

export default (md) => converter.makeHtml(md);
