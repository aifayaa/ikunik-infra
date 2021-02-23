export default (
  title,
  description,
  image,
  {
    height,
    width,
    url,
    androidAppName,
    androidPackageId,
    iosAppName,
    iosAppStoreId,
    fbAppId,
  },
) => {
  const heightText = height ? `<meta property="og:image:height" content="${height}" />` : '';
  const widthText = width ? `<meta property="og:image:width" content="${width}" />` : '';
  const imageUrl = encodeURI(image);
  const androidMeta = (url && androidAppName && androidPackageId) ? `
    <meta property="al:android:url" content="${url}" />\
    <meta property="al:android:package" content="c${androidPackageId}" />\
    <meta property="al:android:app_name" content="${androidAppName}" />\
  ` : '';
  const iosMeta = (url && iosAppName && iosAppStoreId) ? `
    <meta property="al:ios:url" content="${url}" />
    <meta property="al:ios:app_store_id" content="${iosAppStoreId}" />
    <meta property="al:ios:app_name" content="${iosAppName}" />
  ` : '';
  return `
    ${fbAppId ? `<meta property="fb:app_id" content="${fbAppId}" />` : ''}\
    <meta name="twitter:card" content="summary"></meta>\
    <meta property="og:title" content="${title}" />\
    <meta property="og:description" content="${description}" />\
    <meta property="og:image" content="${imageUrl}" />\
    <meta property="og:image:type" content="image/jpeg" />\
    ${widthText}\
    ${heightText}\
    <meta property="og:type" content="website" />\
    ${iosMeta}\
    ${androidMeta}\
  `;
};
