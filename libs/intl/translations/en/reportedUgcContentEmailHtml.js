export default `
<body>
<h3>A content has been reported by user <strong>{{userId}}</strong>
named <strong>{{username}}</strong> on app <strong>{{appName}}</strong></h3><br>
<p><strong>reported content:</strong></p>
<p>
  <q>{{data}}</q>
</p>
<p><strong>reported reason: </strong><q> {{reason}} </strong></p>
<p><strong>reported details: </strong></p> 
<p>
  <q>{{details}}</q>
</p>
<br>
The Crowdaa team.
</body>
`;
