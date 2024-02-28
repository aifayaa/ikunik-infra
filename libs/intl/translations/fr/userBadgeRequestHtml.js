/* eslint-disable import/no-relative-packages */
export default `
<h3>
  Un utilisateur a demandé l'accès à une permission
</h3>
<br>
<h4>Détails: </h4>
<ul>
  <li>ID utilisateur : <strong>{{userId}}</strong></li>
  <li>Nom d'utilisateur : <strong>{{username}}</strong></li>
  <li>Email utilisateur : <strong>{{userEmail}}</strong></li>
  <li>Permission : <strong>{{badgeName}}</strong> (<a href="{{badgeUrl}}">{{badgeUrl}}</a>)</li>
</ul>
<p>
  La liste des utilisateurs peut être consultée sur :<br>
  <a href="{{usersUrl}}">{{usersUrl}}</a>
</p>
`;
