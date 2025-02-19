import { UGCType } from './ugcEntities';

export function getUGCModerationAbstractText(ugc: UGCType) {
  const text = typeof ugc.data === 'string' ? ugc.data : ugc.data.title;

  if (text.length > 100) {
    return `${text.substring(0, 97)}...`;
  }

  return text;
}
