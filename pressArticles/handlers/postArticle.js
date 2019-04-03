import removeMd from 'remove-markdown';
import mdToHtml from '../lib/mdParsing/mdToHtml';
import postArticle from '../lib/postArticle';
import publishArticle from '../lib/publishArticle';
import xmlToHtml from '../lib/xmlParsing/xmlToHtml';
import xmlToText from '../lib/xmlParsing/xmlToText';
import getInfos from '../lib/xmlParsing/getInfos';
import defaultSettings from '../lib/xmlParsing/settings/default.json';

export default async (event, context, callback) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }
    const {
      forceCategoryId,
      forcePictures,
      autoPublish,
    } = event.queryStringParameters || {};

    let categoryId;
    let title;
    let summary;
    let html;
    let md;
    let xml;
    let pictures;
    let plainText;

    switch (event.headers['content-type']) {
      case 'application/json': {
        ({ categoryId, title, summary, md, pictures } = JSON.parse(event.body));
        plainText = removeMd(md);
        html = mdToHtml(md);
        break;
      }
      case 'application/xml': {
        xml = event.body;
        html = xmlToHtml(xml, defaultSettings);
        const infos = getInfos(xml, defaultSettings);
        title = infos.title || infos.name;
        summary = ' ';
        plainText = xmlToText(xml, defaultSettings);
        if (forcePictures) {
          try {
            pictures = JSON.parse(forcePictures);
          } catch (e) {
            pictures = [forcePictures];
          }
        }
        break;
      }
      default:
        throw new Error('unhandled_content_type');
    }

    categoryId = forceCategoryId || categoryId;
    if (!categoryId || !title || !summary || !html || !(md || xml) || !pictures) {
      throw new Error('mal_formed_request');
    }
    const userId = event.requestContext.authorizer.principalId;
    let results = await postArticle({
      userId,
      categoryId,
      title,
      summary,
      html,
      md,
      xml,
      pictures,
      plainText,
    });
    if (autoPublish === 'true') {
      results = await publishArticle(
        userId,
        results.articleId,
        results.draftId,
      );
      results.published = true;
    }
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
