/* eslint-disable import/no-relative-packages */
import {
  handleStreamEnded,
  handleStreamError,
  handleStreamStarted,
} from 'liveStream/lib/onLiveStreamStateChanges';
import { EventBridgeEvent } from 'aws-lambda';

type EventBridgeDetailFieldType = {
  event_name: 'Stream Start' | 'Stream End' | 'Stream Failure';
  channel_name: string;
  stream_id: string;
  reason?: string;
};

/**
 * Example event values :
sessionCreated = {
  version: '0',
  id: 'afd67cde-8c16-58fc-6397-216c9015d797',
  'detail-type': 'IVS Stream State Change',
  source: 'aws.ivs',
  account: '630176884077',
  time: '2024-08-29T13:07:25Z',
  region: 'us-east-1',
  resources: [ 'arn:aws:ivs:us-east-1:630176884077:channel/ICXtBDHYY3XQ' ],
  detail: {
    event_name: 'Session Created',
    channel_name: '0a65572c-c6fc-4687-9411-d31929e60dd9-dev-Ma_1ere_diffusion_n_3',
    stream_id: 'st-1GL2zXSyG8jTRGL7j8s3vac'
  }
}

startEvent = {
  version: '0',
  id: '24a7b970-18b6-24fe-796b-126d1efb6cdc',
  'detail-type': 'IVS Stream State Change',
  source: 'aws.ivs',
  account: '630176884077',
  time: '2024-08-29T11:46:30Z',
  region: 'us-east-1',
  resources: [ 'arn:aws:ivs:us-east-1:630176884077:channel/9EipTxjHkseR' ],
  detail: {
    event_name: 'Stream Start',
    channel_name: '0a65572c-c6fc-4687-9411-d31929e60dd9-dev-Test_events_AWS_EventBridge',
    stream_id: 'st-1FEoYiBVtU55mgxPZZci6QI'
  }
}

stopEvent = {
  version: '0',
  id: '8557c2e8-dbe5-e669-9e55-21d378942731',
  'detail-type': 'IVS Stream State Change',
  source: 'aws.ivs',
  account: '630176884077',
  time: '2024-08-29T11:46:20Z',
  region: 'us-east-1',
  resources: [ 'arn:aws:ivs:us-east-1:630176884077:channel/9EipTxjHkseR' ],
  detail: {
    event_name: 'Session Created',
    channel_name: '0a65572c-c6fc-4687-9411-d31929e60dd9-dev-Test_events_AWS_EventBridge',
    stream_id: 'st-1FEoYiBVtU55mgxPZZci6QI'
  }
}
 */

export default async (
  event: EventBridgeEvent<'IVS Stream State Change', EventBridgeDetailFieldType>
) => {
  try {
    const {
      event_name: eventName,
      // channel_name: channelName,
      stream_id: streamId,
      // reason,
    } = event.detail;

    if (event.resources.length < 1) {
      console.error('Error: Resource not found. Event :', event);
      return;
    }

    const resources = event.resources as [string, ...string[]];
    if (eventName === 'Stream Start') {
      await handleStreamStarted(resources, streamId);
    } else if (eventName === 'Stream End') {
      await handleStreamEnded(resources);
    } else if (eventName === 'Stream Failure') {
      await handleStreamError(resources);
    }
  } catch (e) {
    // TODO Handle me later, maybe?
    console.error('Error :', e);
  }
};
