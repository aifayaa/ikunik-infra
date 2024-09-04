import AWS from 'aws-sdk';
import { LegalDocumentType } from './type';
import { getEnvironmentVariable } from '../../libs/check';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

// Inspired from : https://stackoverflow.com/a/9899441
export function removeScriptsFromHtml(html: string) {
  const scriptRegex = /<script\b.*[^<]\bscript>/gi;
  while (scriptRegex.test(html)) {
    html = html.replace(scriptRegex, '');
  }
  return html;
}

export function wrapHtmlTag(title: string, html: string) {
  const escapedTitle = title.replace(/[&<>"']/g, (tag) => {
    const tagsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    } as Record<string, string>;
    return tagsToReplace[tag] || tag;
  });

  const htmlWrapperHead =
    '<!doctype html>' +
    '<html>' +
    '<head>' +
    '<meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width" />' +
    `<title>${escapedTitle}</title>` +
    '</head>' +
    '<body>';

  const htmlWrapperTail = '</body></html>';

  return `${htmlWrapperHead}<h1>${escapedTitle}</h1>${html}${htmlWrapperTail}`;
}

export function computeS3Filepath(
  documentId: string,
  appId: string,
  type: LegalDocumentType
) {
  const CROWDAA_STAGE = getEnvironmentVariable('CROWDAA_STAGE');
  const CROWDAA_REGION = getEnvironmentVariable('CROWDAA_REGION');
  return `${CROWDAA_STAGE}_${CROWDAA_REGION}/${appId}/${documentId}_${type}.html`;
}

export async function writeS3TosBucket(
  s3Filepath: string,
  title: string,
  html: string
) {
  const documentContent = wrapHtmlTag(title, html);

  const S3_BUCKET_TOS = getEnvironmentVariable('S3_BUCKET_TOS');
  const S3_BUCKET_TOS_HOST = getEnvironmentVariable('S3_BUCKET_TOS_HOST');

  await s3
    .putObject({
      Bucket: S3_BUCKET_TOS,
      Body: documentContent,
      ContentType: 'text/html',
      Key: s3Filepath,
    })
    .promise();

  return `${S3_BUCKET_TOS_HOST}/${s3Filepath}`;
}
