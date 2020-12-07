export default `
<h3>
  Un nouveau commentaire a été {{editionType}} par l'utilisateur <strong title="{{userId}}">{{username}}</strong> sur l'app <strong>{{appName}}</strong>
</h3>
<br>
<h3>Détails: </h3>
{{- ugcDetails}}
<p>
  Vous pouvez modérer les contenus de votre application sur :<br>
  <a href="{{globalModerationUrl}}">{{globalModerationUrl}}</a>
</p>
`;
