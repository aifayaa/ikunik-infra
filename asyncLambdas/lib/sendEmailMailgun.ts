/* eslint-disable import/no-relative-packages */
import { sendEmailMailgunTemplate } from '@libs/email/sendEmailMailgun';

export type MailgunEmailParametersType = {
  from?: string;
  email: string;
  subject: string;
  template: string;
  vars?: {
    [key: string]: any;
  };
  extra?: {
    [key: string]: any;
  };
};

export type RequestOptionsType = {
  retries?: number;
  sleepBetweenRetries?: number;
  logErrors?: boolean;
};

export default async (
  requestData: MailgunEmailParametersType,
  requestOptions: RequestOptionsType = {}
) => {
  const retries = requestOptions.retries || 0;

  for (
    let tryCount = 0, success = false;
    !success && tryCount <= retries;
    tryCount += 1
  ) {
    try {
      await sendEmailMailgunTemplate(
        requestData.from || 'No reply <support@crowdaa.com>',
        requestData.email,
        requestData.subject,
        requestData.template,
        requestData.vars || {},
        requestData.extra || {}
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
