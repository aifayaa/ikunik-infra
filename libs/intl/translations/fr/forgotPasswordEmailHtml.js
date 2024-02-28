/* eslint-disable import/no-relative-packages */
export default `
<p>
  Bonjour <strong>{{username}}</strong>,<br>
  <br>
  Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe sur Crowdaa.<br>
  <strong><a href="{{url}}">{{url}}</a></strong><br>
  ou entrez ce code de vérification dans votre portable:<br>
  <strong style="font-size: 30px;">{{token}}</strong><br>
  Si vous n'avez pas demandé à recevoir cet email, ignorez-le.<br>
  <br>
  Merci,
</p>
`;
