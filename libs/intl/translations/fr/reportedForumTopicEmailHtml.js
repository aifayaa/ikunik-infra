export default `
<h3>
  Un sujet du forum a été signalé comme inapproprié dans la catégorie {{category.name}} par l'utilisateur <strong title="{{userId}}">{{username}}</strong> sur l'app <strong>{{appName}}</strong>
</h3>
<br>
<p><strong>Détails:</strong></p>
<ul>
  <li>Auteur : <strong title="{{contentAuthor._id}}">{{contentAuthor.profile.username}}</strong></li>
  <li>Catégorie : <strong title="{{category._id}}">{{category.name}}</strong></li>
  <li>Sujet créé le : <strong>{{createdAt}}</strong></li>
  <li>Titre : <span title="{{topic._id}}">{{topic.title}}</span></li>
  <li>Contenu : {{topic.content}}</li>
</ul>
<p>
  <strong>Raison: </strong>
  <br>
  <q>{{reason}}</q>
</p>
<p>
  Vous pouvez modérer ce sujet sur :
  <br>
  <a href="{{ugcModerationUrl}}">{{ugcModerationUrl}}</a>
  <br>
  <br>
  (Cette partie étant en développement, il se peut que ce lien ne fonctionne pas, auquel cas merci de contacter l'équipe Crowdaa pour que nous puissions faire le nécessaire.)
</p>
`;
