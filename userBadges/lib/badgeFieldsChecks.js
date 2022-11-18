import { optionnalUrlRegexp } from '../../libs/regexp/url';

export default {
  access(val) {
    switch (val) {
      case 'hidden':
      case 'teaser':
      case 'preview':
      case 'notifications':
        return (true);
      default:
        return (false);
    }
  },
  management(val) {
    switch (val) {
      case 'private-internal':
      case 'private-visible':
      case 'request':
      case 'public':
        return (true);
      default:
        return (false);
    }
  },
  isDefault(val) {
    return (typeof val === 'boolean');
  },
  subscriptionUrl(val) {
    return (!!optionnalUrlRegexp.test(val || ''));
  },
  validationUrl(val) {
    return (!!optionnalUrlRegexp.test(val || ''));
  },
  name(val) {
    return (typeof val === 'string' && !!val);
  },
};
