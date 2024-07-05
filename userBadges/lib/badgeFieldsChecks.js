/* eslint-disable import/no-relative-packages */
import { optionnalUrlRegexp } from '../../libs/regexp/url';

export default {
  access(val) {
    switch (val) {
      case 'hidden':
      case 'teaser':
      case 'preview':
      case 'notifications':
        return true;
      default:
        return false;
    }
  },
  management(val) {
    switch (val) {
      case 'private-internal':
      case 'private-visible':
      case 'request':
      case 'public':
        return true;
      default:
        return false;
    }
  },
  isDefault(val) {
    return typeof val === 'boolean';
  },
  subscriptionUrl(val) {
    return !!optionnalUrlRegexp.test(val || '');
  },
  validationUrl(val) {
    return !!optionnalUrlRegexp.test(val || '');
  },
  name(val) {
    return typeof val === 'string' && !!val;
  },
  color(val) {
    if (typeof val !== 'string' && val !== undefined) {
      return false;
    }
    return true;
  },
  description(val) {
    if (typeof val !== 'string' && val !== undefined) {
      return false;
    }
    return true;
  },
  privacyPolicyLink(val) {
    if (typeof val !== 'string' && val !== undefined) {
      return false;
    }
    return true;
  },
  productId(val) {
    if (typeof val !== 'string' && val !== undefined) {
      return false;
    }
    return true;
  },
};
