/* eslint-disable import/no-relative-packages */
import {
  handleStreamEnded,
  handleStreamError,
  handleStreamStarted,
} from '../lib/onLiveStreamStateChanges';
import { EventBridgeEvent } from 'aws-lambda';

type EventBridgeDetailFieldType = {
  event_name:
    | 'Participant Published'
    | 'Participant Unpublished'
    | 'Participant Publish Error';
  channel_name: string;
  event_time: string;
  session_id: string;
  reason?: string;
};

/**
 * Example event values :
 * Stream start :
{
  version: '0',
  id: 'db65fc17-1612-ef68-3aad-c8a7bfd7b881',
  'detail-type': 'IVS Stage Update',
  source: 'aws.ivs',
  account: '630176884077',
  time: '2025-04-23T06:36:53Z',
  region: 'us-east-1',
  resources: [ 'arn:aws:ivs:us-east-1:630176884077:stage/oWXSOfbOLMte' ],
  detail: {
    session_id: 'st-1CVugbu2cf2n8',
    event_name: 'Participant Published',
    event_time: '2025-04-23T06:36:53Z',
    user_id: '',
    participant_id: '03JY4smU3eXc'
  }
}
 * Stream End :
{
  version: '0',
  id: 'e41f434d-733f-8207-7086-b73a145337ca',
  'detail-type': 'IVS Stage Update',
  source: 'aws.ivs',
  account: '630176884077',
  time: '2025-04-23T06:37:11Z',
  region: 'us-east-1',
  resources: [ 'arn:aws:ivs:us-east-1:630176884077:stage/oWXSOfbOLMte' ],
  detail: {
    session_id: 'st-1CVugbu2cf2n8',
    event_name: 'Participant Unpublished',
    event_time: '2025-04-23T06:37:11Z',
    user_id: '',
    participant_id: '03JY4smU3eXc'
  }
}
 */

export default async (
  event: EventBridgeEvent<'IVS Stage Update', EventBridgeDetailFieldType>
) => {
  try {
    const {
      resources,
      detail: { event_name: eventName },
    } = event;

    if (event.resources.length < 1) {
      console.error('Error: Resource not found. Event :', event);
      return;
    }

    if (eventName === 'Participant Published') {
      await handleStreamStarted(resources);
    } else if (eventName === 'Participant Unpublished') {
      await handleStreamEnded(resources);
    } else if (eventName === 'Participant Publish Error') {
      await handleStreamError(resources);
    }
  } catch (e) {
    // TODO Handle me later, maybe?
    console.error('Error :', e);
  }
};
