export default `
<h3>
  A forum topic was reported as inappropriate in the category {{category.name}} by the user <strong title="{{userId}}">{{username}}</strong> in the app <strong{{appName}}</strong>
</h3>
<br>
<p><strong>Details:</strong></p>
<ul>
  <li>Author : <strong title="{{contentAuthor._id}}">{{contentAuthor.profile.username}}</strong></li>
  <li>Category : <strong title="{{category._id}}">{{category.name}}</strong></li>
  <li>Topic created at : <strong>{{createdAt}}</strong></li>
  <li>Title : <span title="{{topic._id}}">{{topic.title}}</span></li>
  <li>Content : {{topic.content}}</li>
</ul>
<p>
  <strong>Reason: </strong>
  <br>
  <q>{{reason}}</q>
</p>
<p>
  You can moderate this topic on :
  <br>
  <a href="{{ugcModerationUrl}}">{{ugcModerationUrl}}</a>
  <br>
  <br>
  (This part being currently in development, this link may not work yet. If that is the case, please contact the Crowdaa team so that we can handle this ourselves.)
</p>
`;
