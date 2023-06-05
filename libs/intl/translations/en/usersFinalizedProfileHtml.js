export default `
<h3>
  A new user just completed his profile
</h3>
<br>
<h4>Details: </h4>
<ul>
  <li>User ID : <strong>{{userId}}</strong></li>
  <li>User name : <strong>{{username}}</strong></li>
  <li>User email : <strong>{{userEmail}}</strong></li>
  {{- extraFields}}
</ul>
<p>
  The list of all users can be seen from :<br>
  <a href="{{usersUrl}}">{{usersUrl}}</a>
</p>
`;
