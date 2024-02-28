/* eslint-disable import/no-relative-packages */
export default `
<h3>
  A user requested access for a permission
</h3>
<br>
<h4>Details: </h4>
<ul>
  <li>User ID : <strong>{{userId}}</strong></li>
  <li>Username : <strong>{{username}}</strong></li>
  <li>User Email : <strong>{{userEmail}}</strong></li>
  <li>Permission : <strong>{{badgeName}}</strong> (<a href="{{badgeUrl}}">{{badgeUrl}}</a>)</li>
</ul>
<p>
  The list of all users can be seen on :<br>
  <a href="{{usersUrl}}">{{usersUrl}}</a>
</p>
`;
