export default `
<h3>
  L'utilisateur ayant écrit l'article ci-dessous a été reporté par l'utilisateur <strong title="{{userId}}">{{username}}</strong> sur l'app <strong>{{appName}}</strong>
</h3>
<br>
<p><strong>Détails:</strong></p>
{{- ugcDetails}}
<p><strong>Raison: </strong><q> {{reason}} </q></strong></p>
<p><strong>Détails: </strong></p> 
<p>
  <q>{{details}}</q>
</p>
`;
