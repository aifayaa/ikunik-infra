// TODO: intl
export const forgotPasswordEmailHTML = (username, url, token, email) => `
  <body>
  <p>Hi <strong>${username}</strong>,<br>
  Click the link below to reset your password on Crowdaa.<br>
  <strong><a href="${`${url}?token=${token}`}&email=${email}">reset my password</a></strong><br>
  or enter this verification code on your device:<br>
  <strong style="font-size: 30px;">${token}</strong><br>
  If you didn't request this email, please ignore it.
  Thanks,
  </p><br>
  <br>
  The Crowdaa team.
  </body>
`;
