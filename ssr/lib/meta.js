export default (title, description, image, { height, width }) => {
  const heightText = height ? `<meta property="og:image:height" content="${height}" />` : '';
  const widthText = width ? `<meta property="og:image:width" content="${width}" />` : '';
  return `\
    <meta property="og:title" content="${title}" />\
    <meta property="og:description" content="${description}" />\
    <meta property="og:image" content="${image}" /> \
    <meta property="og:image:type" content="image/jpeg" /> \
    ${widthText} \
    ${heightText} \
    <meta property="og:type" content="website" />\
  `;
};
