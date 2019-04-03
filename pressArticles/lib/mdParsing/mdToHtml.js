import showdown from 'showdown';

const converter = new showdown.Converter({
  noHeaderId: true,
});

export default md => converter.makeHtml(md);
