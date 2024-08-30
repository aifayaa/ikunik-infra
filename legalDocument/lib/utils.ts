import AWS from 'aws-sdk';
import { LegalDocumentType } from './type';
import { getEnvironmentVariable } from '../../libs/check';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

export function wrapHtmlTag(title: string, html: string) {
  const htmlWrapperHead =
    '<!doctype html>' +
    '<html>' +
    '<head>' +
    '<meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width" />' +
    '<title>Terms of Services</title>' +
    '</head>' +
    '<body>';

  const htmlWrapperTail = '</body></html>';

  return `${htmlWrapperHead}<h1>${title}</h1>${html}${htmlWrapperTail}`;
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
