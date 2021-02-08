export default `
<h3>
  Un nouvel article a été {{editionType}} par l'utilisateur <strong title="{{userId}}">{{username}}</strong> sur l'app <strong>{{appName}}</strong>
</h3>
<br>
<h3>Détails: </h3>
{{- ugcDetails}}
<p>
  Vous pouvez modérer cet article sur :<br>
  <a href="{{ugcModerationUrl}}">{{ugcModerationUrl}}</a>
</p>
`;
