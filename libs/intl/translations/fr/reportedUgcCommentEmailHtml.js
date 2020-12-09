export default `
<h3>
  Un commentaire a été reporté par l'utilisateur <strong title="{{userId}}">{{username}}</strong> sur l'app <strong>{{appName}}</strong>
</h3>
<br>
<p><strong>Détails:</strong></p>
{{- ugcDetails}}
<p><strong>Raison: </strong><q> {{reason}} </q></strong></p>
<p><strong>Détails: </strong></p> 
<p>
  <q>{{details}}</q>
</p>
<p>
  Vous pouvez modérer les contenus de votre application sur :<br>
  <a href="{{globalModerationUrl}}">{{globalModerationUrl}}</a>
</p>
`;
