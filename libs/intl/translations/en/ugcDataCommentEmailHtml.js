/* eslint-disable import/no-relative-packages */
export default `
<ul>
  <li><strong>Commented article title :</strong> {{ugc.rootParent.title}}</li>
  <li><strong>Comment author :</strong> {{author.profile.username}}</li>
  <li>
    <strong>Comment :</strong><br>
    <q>
      {{ugc.data}}
    </q>
  </li>
</ul>
`;
