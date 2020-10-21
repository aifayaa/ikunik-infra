// TODO: intl
export const addressConfirmationEmailHTML = (username, url) => `
  <body>
  <p>Hi <strong>${username}</strong>,<br>
  <br>
  One last step!<br>
  To confirm your email address, please click here : <a href="${url}">${url}</a>.<br>
  If you can't click on this link, copy and paste it in your browser.
  </p><br>
  <br>
  The Crowdaa team.
  </body>
`;
