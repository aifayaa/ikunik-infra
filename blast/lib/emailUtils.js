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
    
    
                  <a style="margin-left: 30px;" href="https://play.google.com/store/apps/details?id=com.crowdaa.free.www">
                  <img style="width: 200px; " src="http://website-2068.kxcdn.com/android_btn.png">
                  </a>
    
                  
                  <a style="margin-left: 30px;" href="https://itunes.apple.com/fr/app/crowdaa/id1074256465?ls=1&mt=8" >
                  <img style="width: 200px; " src="http://website-2068.kxcdn.com/AppStoreButton.gif">
                  </a>
    
                  <div style="margin: auto; width: 70%;">
                  <button style=" -moz-box-shadow: 0px 0px 0px 0px #3dc21b;
                    -webkit-box-shadow: 0px 0px 0px 0px #3dc21b;
                    box-shadow: 0px 0px 0px 0px #3dc21b;
                    background-color:#44c767;
                    border:1px solid #18ab29;
                    display:inline-block;
                    cursor:pointer;
                    color:#ffffff;
                    font-family:Arial;
                    font-size:17px;
                    padding:16px 31px;
                    text-decoration:none;
                    text-shadow:0px 1px 0px #2f6627;
        "> Vous êtes un artiste? Rejoignez nous sur Crowdaa! </button>
                    
                  </div>
                              
                  <br/>
                  <br/>
                              
                  <!-- social & contact -->
                  <table  style="background-color: #ffffff; width:100%;" >
                    <tr>
                      <td>
                      
                        <!--- column 1 -->
                        <table align="left" class="column">
                          <tr>
                            <td>
                              
    
                              <a  style="margin-left: 30px;" href="https://www.facebook.com/crowdaa/">
                                <img style="width: 200px; " src="http://website-2068.kxcdn.com/facebook_button.png">
                              </a>
    
                              <a  style="margin-left: 30px;" href="https://twitter.com/_crowdaa" class="soc-btn tw">
                                <img style="width: 200px; " src="http://website-2068.kxcdn.com/twitter-button.png"></a>
                              <br>
                            </td>
                          </tr>
                        </table><!-- /column 1 -->
                        <span class="clear"></span>
                      </td>
                    </tr>
                  </table><!-- /social & contact -->
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
