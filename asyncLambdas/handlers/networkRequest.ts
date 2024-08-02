/* eslint-disable import/no-relative-packages */
import networkRequest, {
  RequestOptionsType,
  RequestParametersType,
} from '../lib/networkRequest';

type EventParametersType = {
  request: RequestParametersType;
  options?: RequestOptionsType;
};

export default async (event: EventParametersType) => {
  try {
    await networkRequest(event.request, event.options);
  } catch (exception) {
    console.warn('Uncaught exception during request', event, exception);
  }
};
