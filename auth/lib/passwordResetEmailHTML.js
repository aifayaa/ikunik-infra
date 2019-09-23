// TODO: intl
export const passwordResetEmailHTML = (username, email) => `
  <body>
  <p>Hi <strong>${username}</strong>,<br>
  Your password for your Crowdaa account, associated with the email address <strong>${email}</strong>, has been successfully updated.<br>
  You can now login on our services with your new password .
  </p><br>
  <br>
  The Crowdaa team.
  </body>
`;
