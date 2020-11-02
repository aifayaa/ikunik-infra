export default `
  <body>
  <p>Hi <strong>{{username}}</strong>,<br>
  Click the link below to reset your password on Crowdaa.<br>
  <strong><a href="{{url}}">{{url}}</a></strong><br>
  or enter this verification code on your device:<br>
  <strong style="font-size: 30px;">{{token}}</strong><br>
  If you didn't request this email, please ignore it.
  Thanks,
  </p><br>
  <br>
  The Crowdaa team.
  </body>
`;
