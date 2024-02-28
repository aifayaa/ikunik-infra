/* eslint-disable import/no-relative-packages */
import get from 'lodash/get';

export default {
  name: 'default',
  template: (data, contact, app) => `
    <table class="body-wrap">
      <tr>
        <td></td>
        <td style="background-color: #ebebeb;">
          <div class="content">
          <table>
            <tr>
              <td>
                <h3>Salut <i>${contact.name}</i> !</h3>
                <p>${data.message}</p>
                <a style="margin-left: 30px;" href="https://play.google.com/store/apps/details?id=${get(app, 'builds.android.packageId')}">
                <img style="width: 200px; " src="http://website-2068.kxcdn.com/android_btn.png">
                </a>
                <a style="margin-left: 30px;" href="https://apps.apple.com/us/app/id${get(app, 'builds.ios.iosAppId')}" >
                <img style="width: 200px;" src="http://website-2068.kxcdn.com/AppStoreButton.gif">
                </a>
                <br/>
                <br/>
              </td>
            </tr>
          </table>
          </div>
        </td>
        <td></td>
      </tr>
      </table><!-- /BODY -->
      <!-- FOOTER -->
      <table class="footer-wrap">
      <tr>
        <td></td>
        <td class="container">
            <!-- content -->
            <div class="content">
            <table>
            <tr>
              <td align="center">
                <p>
                  <a href="%unsubscribe_url%"><unsubscribe>Se désabonner</unsubscribe></a>
                </p>
              </td>
            </tr>
          </table>
            </div><!-- /content -->
        </td>
        <td></td>
      </tr>
    </table><!-- /FOOTER -->
  `,
};
