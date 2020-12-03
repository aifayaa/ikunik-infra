export default `
<ul>
  <li>Titre: {{ugc.data.title}}</li>
  <li>
    Image: <br>
    <img style="height: 400px;" alt="Image du contenu utilisateur" src="{{ugc.dataPictureUrl}}" />
  </li>
  <li>Contenu: {{ugc.data.content}}</li>
</ul>
`;
