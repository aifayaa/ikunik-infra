/* eslint-disable import/no-relative-packages */
import sendEmailTemplate, {
  RequestOptionsType,
  TemplateEmailParametersType,
} from '../lib/sendEmailTemplate';

type EventParametersType = {
  email: TemplateEmailParametersType;
  options?: RequestOptionsType;
};

export default async (event: EventParametersType) => {
  try {
    await sendEmailTemplate(event.email, event.options);
  } catch (exception) {
    console.warn('Uncaught exception during email', event, exception);
  }
};
