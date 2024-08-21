/* eslint-disable import/no-relative-packages */
import sendEmailMailgun, {
  RequestOptionsType,
  MailgunEmailParametersType,
} from '../lib/sendEmailMailgun';

type EventParametersType = {
  email: MailgunEmailParametersType;
  options?: RequestOptionsType;
};

export default async (event: EventParametersType) => {
  try {
    await sendEmailMailgun(event.email, event.options);
  } catch (exception) {
    console.warn('Uncaught exception during email', event, exception);
  }
};
