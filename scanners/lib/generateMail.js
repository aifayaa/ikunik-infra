export default ({ type, data, html }) => {
  if (html) return html;
  switch (type) {
    case 'standardMail':
      return `
        <div style="font-family: sans-serif">
          <p style="text-align: center">
            <img src="https://d1m3cwh7hj7lba.cloudfront.net/crowdaa-logos/crowdaa_logo_pink2.png" width="20%"/>
          </p>
          <p>
            Vous êtes invité à gérer les <strong> droits d'accès pour l'événement ${data.name}  qui va se déroulé le ${data.date}</strong>.
            Le jour de l'événement veuillez consulter le lien suivant afin de pouvoir composter les billets :
          </p>
          <h1 style="text-align:center;">
            <a href="https://ticket.crowdaa.com/scanners/${data.scannerId}">
              https://ticket.crowdaa.com/scanners/${data.scannerId}
            </a>  
          </h1>
        </div>
    `;
    default:
      return null;
  }
};
