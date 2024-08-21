/* eslint-disable import/no-relative-packages */
import { sendEmailTemplate } from '@libs/email/sendEmail';

export type TemplateEmailParametersType = {
  lang: string;
  template: string;
  email: string;
  subject: string;
  html: string;
};

export type RequestOptionsType = {
  retries?: number;
  sleepBetweenRetries?: number;
  logErrors?: boolean;
};

export default async (
  requestData: TemplateEmailParametersType,
  requestOptions: RequestOptionsType = {}
) => {
  const retries = requestOptions.retries || 0;

  for (
    let tryCount = 0, success = false;
    !success && tryCount <= retries;
    tryCount += 1
  ) {
    try {
      await sendEmailTemplate(
        requestData.lang,
        requestData.template,
        requestData.email,
        requestData.subject,
        requestData.html
      );
      success = true;
    } catch (e) {
      if (requestOptions.logErrors) {
        console.error('Error running query', requestData, '=>', e);
      }
      if (requestOptions.sleepBetweenRetries) {
        await new Promise((resolve) => {
          setTimeout(resolve, requestOptions.sleepBetweenRetries);
        });
      }
      /* Skip */
    }
  }
};
