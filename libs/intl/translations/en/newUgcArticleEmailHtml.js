/* eslint-disable import/no-relative-packages */
export default `
<h3>
  A new article was {{editionType}} by user <strong title="{{userId}}">{{username}}</strong> on app <strong>{{appName}}</strong>
</h3>
<br>
<h3>Details: </h3>
{{- ugcDetails}}
<p>
  You can moderate this article on :<br>
  <a href="{{ugcModerationUrl}}">{{ugcModerationUrl}}</a>
</p>
`;
