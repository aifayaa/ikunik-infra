/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { escapeHtmlEntities } from '@libs/utils';
import {
  TemplateEmailParametersType,
  RequestOptionsType,
} from '../../asyncLambdas/lib/sendEmailTemplate';

const { STAGE, REGION, CROWDAA_REGION } = process.env;

const MAIL_LANG = 'en';
const MAIL_TO = 'prod@crowdaa.com';

const lambda = new Lambda({
  region: REGION,
});

const { COLL_APPS } = mongoCollections;

export default async (
  appId: string,
  categoryId: string,
  rssFeedUrl: string | null | undefined,
  deleted: boolean = false
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId }, { $project: { name: 1 } });

    const urlStageRegionField =
      STAGE === 'prod' ? CROWDAA_REGION : `${STAGE}-${CROWDAA_REGION}`;
    const dashboardUrl = `https://app.crowdaa.com/${urlStageRegionField}/apps/${appId}/categories/${categoryId}`;

    let subject = `[${STAGE}/${CROWDAA_REGION}] RSS Feed URL changed for ${escapeHtmlEntities(app.name)}`;
    let html = `<h3>The RSS Feed URL changed for ${escapeHtmlEntities(app.name)} (${appId}/${categoryId})</h3>
<p>New RSS Feed URL : <pre>${escapeHtmlEntities(`${rssFeedUrl}`)}</pre></p>
<p>See this category here : <a href="${escapeHtmlEntities(dashboardUrl)}">${escapeHtmlEntities(dashboardUrl)}</a></p>`;

    if (deleted) {
      subject = `[${STAGE}/${CROWDAA_REGION}] RSS Feed deleted for ${escapeHtmlEntities(app.name)}`;
      html = `<h3>The category ${categoryId} was deleted for ${escapeHtmlEntities(app.name)} (${appId}/${categoryId})</h3>
<p>It contained this RSS Feed URL : <pre>${escapeHtmlEntities(`${rssFeedUrl}`)}</pre></p>
<p>Previous category url : ${escapeHtmlEntities(dashboardUrl)}</p>`;
    }

    await lambda
      .invokeAsync({
        FunctionName: `asyncLambdas-${process.env.STAGE}-sendEmailTemplate`,
        InvokeArgs: JSON.stringify({
          email: {
            lang: MAIL_LANG,
            email: MAIL_TO,
            template: 'internal',
            subject,
            html,
          } as TemplateEmailParametersType,
          options: {
            retries: 5,
            sleepBetweenRetries: 30 * 1000,
            logErrors: true,
          } as RequestOptionsType,
        }),
      })
      .promise();
  } finally {
    client.close();
  }
};
