export default `
<ul>
  <li><strong>Titre :</strong> {{ugc.data.title}}</li>
  <li><strong>Auteur :</strong> {{author.profile.username}}</li>
  <li>
    <strong>{{- mediaType}} :</strong><br>
    <a href="{{ugc.mediaPictureUrl}}">
      <img style="height: 300px;" alt="Image du contenu utilisateur" src="{{ugc.mediaPictureUrl}}" />
    </a>
  </li>
  <li>
    <strong>Contenu :</strong><br>
    <q>
      {{ugc.data.content}}
    </q>
  </li>
</ul> 
`;
