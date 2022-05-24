export default `
<ul>
  <li><strong>Title :</strong> {{ugc.data.title}}</li>
  <li><strong>Author :</strong> {{author.profile.username}}</li>
  <li>
    <strong>{{- mediaType}} :</strong><br>
    <a href="{{ugc.mediaPictureUrl}}">
      <img style="height: 300px;" alt="Image du contenu utilisateur" src="{{ugc.mediaPictureUrl}}" />
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
