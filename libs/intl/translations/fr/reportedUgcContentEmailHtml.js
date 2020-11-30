export default `
<h3>Un contenu a été reporté par l'utilisateur <strong>{{userId}}</strong>
nommé <strong>{{username}}</strong> sur l'app <strong>{{appName}}</strong></h3><br>
<p><strong>Contenu reporté:</strong></p>
<p>
  <q>{{data}}</q>
</p>
<p><strong>Raison: </strong><q> {{reason}} </strong></p>
<p><strong>Détails: </strong></p> 
<p>
  <q>{{details}}</q>
</p>
`;
