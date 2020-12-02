export default `
<p>
  Bonjour <strong>{{username}}</strong>,<br>
  <br>
  Clique sur le lien ci-dessous pour réinitialiser ton mot de passe sur Crowdaa.<br>
  <strong><a href="{{url}}">{{url}}</a></strong><br>
  ou entre ce code de vérification sur ton portable:<br>
  <strong style="font-size: 30px;">{{token}}</strong><br>
  Si tu n'a pas demandé à recevoir cet email, ignore-le.<br>
  <br>
  Merci,
</p>
`;
