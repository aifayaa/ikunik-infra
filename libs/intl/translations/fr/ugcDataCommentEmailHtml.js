export default `
<ul>
  <li><strong>Titre de l'article commenté :</strong> {{ugc.rootParent.title}}</li>
  <li><strong>Auteur du commentaire :</strong> {{author.profile.username}}</li>
  <li>
    <strong>Commentaire à modérer :</strong><br>
    <q>
      {{ugc.data}}
    </q>
  </li>
</ul>
`;
