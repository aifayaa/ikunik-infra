/* eslint-disable import/no-relative-packages */
import appleLogin from './appleLogin';
import changePassword from './changePassword';
import facebookLogin from './facebookLogin';
import forgotPassword from './forgotPassword';
import login from './login';
import logout from './logout';
import oidcLogin from './oidcLogin';
import register from './register';
import resetPassword from './resetPassword';
import validateEmail from './validateEmail';

import js from '../serverless';

export default (libs, output) => {
  appleLogin(libs, output);
  changePassword(libs, output);
  facebookLogin(libs, output);
  forgotPassword(libs, output);
  login(libs, output);
  logout(libs, output);
  oidcLogin(libs, output);
  register(libs, output);
  resetPassword(libs, output);
  validateEmail(libs, output);

  libs.checks.forMissingAPIs(js, output);
};
