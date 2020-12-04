export default `
<ul>
  <li><strong>Commented article title :</strong> {{ugc.rootParent.title}}</li>
  <li><strong>Comment author :</strong> {{user.profile.username}}</li>
  <li>
    <strong>Comment :</strong><br>
    <q>
      {{ugc.data}}
    </q>
  </li>
</ul>
`;
