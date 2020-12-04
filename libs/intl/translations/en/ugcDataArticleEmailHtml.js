export default `
<ul>
  <li><strong>Title :</strong> {{ugc.data.title}}</li>
  <li><strong>Author :</strong> {{user.profile.username}}</li>
  <li>
    <strong>Picture :</strong><br>
    <a href="{{ugc.dataPictureUrl}}">
      <img style="height: 300px;" alt="Image du contenu utilisateur" src="{{ugc.dataPictureUrl}}" />
    </a>
  </li>
  <li>
    <strong>Content :</strong><br>
    <q>
      {{ugc.data.content}}
    </q>
  </li>
</ul>
`;
