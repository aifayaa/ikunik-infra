export default `
<ul>
  <li>Title: {{ugc.data.title}}</li>
  <li>
    Picture: <br>
    <img style="height: 300px;" alt="Image du contenu utilisateur" src="{{ugc.dataPictureUrl}}" />
  </li>
  <li>Content: {{ugc.data.content}}</li>
</ul>
`;
