export default `
<h3>
  Un contenu a été reporté par l'utilisateur <strong title="{{userId}}">{{username}}</strong> sur l'app <strong>{{appName}}</strong>
</h3>
<br>
<p><strong>Contenu reporté:</strong></p>
{{- ugcDetails}}
<p><strong>Raison: </strong><q> {{reason}} </q></strong></p>
<p><strong>Détails: </strong></p> 
<p>
  <q>{{details}}</q>
</p>
<p>
  Vous pouvez modérer les contenus de votre application sur :
  <a href="{{globalModerationUrl}}">{{globalModerationUrl}}</a>
</p>
`;
