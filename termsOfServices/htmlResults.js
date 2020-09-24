export const getHtmlResults = (results) => (
  `<html>
    ${results.reduce((acc, curr) => (`${acc} ${curr.html}`), '')}
  <html>`
);
