export default function actionV2ToAction(actionV2) {
  if (!actionV2) {
    return '';
  }

  switch (actionV2.type) {
    case 'callPhoneNumber':
      return `tel:${actionV2.target}`;
    case 'composeEmail':
      return `mailto:${actionV2.target}`;
    case 'goToTab':
      return '';
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
