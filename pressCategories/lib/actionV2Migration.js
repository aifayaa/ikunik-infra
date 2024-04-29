const ACTIONS = {
  callPhoneNumber: 'callPhoneNumber',
  composeEmail: 'composeEmail',
  goToTab: 'goToTab',
  openArticle: 'openArticle',
  openPdf: 'openPdf',
  openUrl: 'openUrl',
};

export function actionV2ToAction(actionV2) {
  if (!actionV2) {
    return '';
  }

  switch (actionV2.type) {
    case 'callPhoneNumber':
      return `tel:${actionV2.target}`;
    case 'composeEmail':
      return `mailto:${actionV2.target}`;
    case 'goToTab':
      return `/tab/:${actionV2.target}`;
    case 'openArticle':
      return `/articles/${actionV2.target}`;
    case 'openPdf':
      return `/pdf/:${actionV2.target}`;
    case 'openUrl':
      return actionV2.target;
    default:
      return '';
  }
}

export function actionToActionV2(action) {
  if (!action) {
    return null;
  }

  if (action.match(/^\/articles\//)) {
    return {
      type: ACTIONS.openArticle,
      target: action.substring('/articles/'.length),
    };
  }
  if (action.match(/^\/pdf\//)) {
    return {
      type: ACTIONS.openPdf,
      target: decodeURIComponent(action.substring('/pdf/'.length)),
    };
  }
  if (action.match(/^\/tab\//)) {
    return {
      type: ACTIONS.goToTab,
      target: decodeURIComponent(action.substring('/tab/'.length)),
    };
  }
  if (action.match(/^mailto:/)) {
    return {
      type: ACTIONS.composeEmail,
      target: action.substring('mailto:'.length),
    };
  }
  if (action.match(/^tel:/)) {
    return {
      type: ACTIONS.callPhoneNumber,
      target: action.substring('tel:'.length),
    };
  }
  if (action.match(/^https?:\/\//)) {
    return {
      type: ACTIONS.openUrl,
      target: action,
    };
  }

  return null;
}
