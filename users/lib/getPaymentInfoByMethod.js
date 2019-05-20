import getProfile from './getProfile';

export default async (userId, method, profile, appId) => {
  let wProfile;
  if (method === 'paypal' || method === 'btc') {
    wProfile = profile || await getProfile(userId, appId);
    if (!wProfile) throw new Error('no profile found');
  }
  switch (method) {
    case 'paypal':
      if (!wProfile.payPalEmail) throw new Error('no paypal account found');
      return wProfile.payPalEmail;
    case 'credits':
      return userId;
    case 'btc':
      if (!wProfile.btcAddress) throw new Error('no bitcoin address account found');
      return wProfile.btcAddress;
    default:
      throw new Error(`payment method ${method} not supported yet`);
  }
};
