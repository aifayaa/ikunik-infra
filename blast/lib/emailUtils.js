const {
  ANDROID_PACKAGE_ID = 'com.crowdaa.free.www',
  IOS_APP_ID = '1074256465',
} = process.env;

export const generateEmailHTML = ({ name, data, html }, contact) => {
  if (html) return html;
  switch (name) {
    case 'albumOut':
      return `
      <table class="body-wrap">
        <tr>
          <td></td>
          <td style="background-color: #ebebeb;">
            <div class="content">
            <table>
              <tr>
                <td>
                  <h3>Salut <i>${contact.name}</i> !</h3>
                  <p class="lead">${data.intro}</p>
                  <!-- A Real Hero (and a real human being) -->
                  <p class="text-center"><img src="${data.image}" /></p><!-- /hero -->
                  <h3><strong>"${data.album}"</strong> est disponible!</h3>
                  <p>${data.message}</p>
                  <a style="margin-left: 30px;" href="https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}">
                  <img style="width: 200px; " src="http://website-2068.kxcdn.com/android_btn.png">
                  </a>
                  <a style="margin-left: 30px;" href="https://itunes.apple.com/fr/app/crowdaa/id${IOS_APP_ID}?ls=1&mt=8" >
                  <img style="width: 200px; " src="http://website-2068.kxcdn.com/AppStoreButton.gif">
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
    `;
    case 'default':
      return `
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
                  <a style="margin-left: 30px;" href="https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}">
                  <img style="width: 200px; " src="http://website-2068.kxcdn.com/android_btn.png">
                  </a>
                  <a style="margin-left: 30px;" href="https://apps.apple.com/us/app/id${IOS_APP_ID}?ls=1&mt=8" >
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
    `;
    default:
      return null;
  }
};
