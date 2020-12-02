export default `
<p>
  Hi <strong>{{username}}</strong>,<br>
  <br>
  Click the link below to reset your password on Crowdaa.<br>
  <strong><a href="{{url}}">{{url}}</a></strong><br>
  or enter this verification code on your device:<br>
  <strong style="font-size: 30px;">{{token}}</strong><br>
  If you didn't request this email, please ignore it.<br>
  <br>
  Thanks,
</p>
`;
