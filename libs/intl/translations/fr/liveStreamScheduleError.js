export default `
<h3>
  La planification du lancement automatique de la diffusion en direct <u>{{liveStreamName}}</u> prévu <u>{{liveStreamStartDate}} (GMT+0)</u> a échoué. Merci de réessayer ultérieurement.<br>
  Le cas échéant, vous devrez la lancer manuellement un peu avant la date de départ afin de pouvoir commencer à transmettre votre flux vidéo.
</h3>
<br>
<h3>Détails de l'erreur rencontrée: </h3>
<p>
  {{error}}
</p>
`;
