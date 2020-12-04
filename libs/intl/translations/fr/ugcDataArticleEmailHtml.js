export default `
<ul>
  <li><strong>Titre :</strong> {{ugc.data.title}}</li>
  <li><strong>Auteur :</strong> {{user.profile.username}}</li>
  <li>
    <strong>Image :</strong><br>
    <a href="{{ugc.dataPictureUrl}}">
      <img style="height: 400px;" alt="Image du contenu utilisateur" src="{{ugc.dataPictureUrl}}" />
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
