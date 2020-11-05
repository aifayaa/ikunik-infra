import appleLogin from './appleLogin';
import facebookLogin from './facebookLogin';
import forgotPassword from './forgotPassword';
import login from './login';
import logout from './logout';
import oidcLogin from './oidcLogin';
import register from './register';
import resetPassword from './resetPassword';
import validateEmail from './validateEmail';

import yaml from '../serverless.yml';

export default (libs, output) => {
  appleLogin(libs, output);
  facebookLogin(libs, output);
  forgotPassword(libs, output);
  login(libs, output);
  logout(libs, output);
  oidcLogin(libs, output);
  register(libs, output);
  resetPassword(libs, output);
  validateEmail(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
