export default `
<h3>
  The user who wrote the comment below has been reported by user <strong title="{{userId}}">{{username}}</strong> on app <strong>{{appName}}</strong>
</h3>
<br>
<p><strong>Details:</strong></p>
{{- ugcDetails}}
<p><strong>Reported reason: </strong><q> {{reason}} </q></strong></p>
<p><strong>Reported details: </strong></p> 
<p>
  <q>{{details}}</q>
</p>
<p>
  You can moderate this comment on :<br>
  <a href="{{ugcModerationUrl}}">{{ugcModerationUrl}}</a>
</p>
`;
