export default ({ type, data, qrcode, html }) => {
  if (html) return html;
  switch (type) {
    case 'standardTickets':
      return `
        <div style="font-family: sans-serif">
          <p style="text-align: center">
              <img src="https://d1m3cwh7hj7lba.cloudfront.net/crowdaa-logos/crowdaa_logo_pink2.png" width="25%"/>
          </p>
          <h1 style="margin:0;">
              ${data.eventName}
          </h1>
          <p style="margin:0;">${data.date} - ${data.stageName}</p>
          <h2 style="margin-bottom:0;">${data.ticketName}</h2>
          <p style="margin:0;">${data.ticketCategory}: ${data.ticketPrice} crowdaa credits</p>
          <p style="text-align: center">
              <img src="${qrcode}"/>
          </p>
          <table style="" width="100%">
              <tr>
                  <td width="50%">
                      ${data.organisationName}
                      <br/>
                      ${data.organisationAdr}
                      <br />
                      Email: ${data.organisationMail}
                      <hr/>
                      Date de la commande: ${data.orderDate}
                      <br />
                      Billet n°${data.ticketId}
                  </td>
                  <td style="text-align:right;padding:15px;">
                      <img src="${data.img}" width="100%"/>
                  </td>
              </tr>
          </table>
          <h6 style="margin-bottom:0;">Conditions d'utilisation</h6>
          <small style="font-size:10">
      Pour être valable, ce e-ticket (billet électronique) est soumis aux conditions générales de vente de Crowdaa, et le cas échéant à celles de l'organisateur que vous avez acceptées lors de la commande. RAPPEL : Ce e-ticket est non remboursable. Sauf accord contraire de l'organisateur, ce e-ticket est personnel, incessible et non échangeable.

          <strong>CONTRÔLE</strong> :L'accès à l'évènement est soumis au contrôle de validité de votre e-ticket. Ce e-ticket est uniquement valable pour le lieu, la séance, la date et l'heure précis de l'évènement. Passée l'heure de début, l'accès à l'évènement n'est plus garanti et ne donne droit à aucun remboursement. Nous vous conseillons par conséquent d'arriver avant le début de l'évènement. Les e-tickets partiellement imprimés, souillés, endommagés ou illisibles seront considérés comme non valables et pourront être refusés par l'organisateur.

      L'organisateur se réserve également le droit d'accepter ou refuser les autres supports, notamment électroniques (téléphone portable, tablette,etc.). Chaque e-ticket est muni d'un code permettant l'accès à l'évènement à une seule personne. Pour être valable ce e-ticket ne doit pas avoir fait l'objet d'une opposition ou d'un impayé sur la carte bancaire utilisée pour la commande, auquel cas le code serait désactivé. Lors des contrôles, vous devez obligatoirement être muni d'une pièce d'identité officielle avec photo et en cours de validité. Suite au contrôle, ce eticket doit être conservé jusqu'à la fin de l'évènement. <strong>FRAUDE</strong> : Il est interdit de reproduire, d'utiliser une copie, de dupliquer, de contrefaire ce e-ticket de quelque manière que ce soit, sous peine de poursuites pénales. De même, toute commande effectuée à l'aide d'un moyen de paiement illicite pour se procurer un e-ticket entraînera des poursuites pénales et l'invalidité de ce e-ticket. <strong>RESPONSABILITE</strong> : L'acheteur demeure responsable de l'utilisation qui est faite des e-tickets, ainsi en cas de perte, de vol ou de duplication d'un e-ticket valide, seule la première personne détentrice du e-ticket pourra accéder à l'évènement. Crowdaa décline toute responsabilité pour les anomalies pouvant survenir en cours de commande, de traitement ou d'impression du e-ticket dans la mesure où elle ne les a pas provoquées intentionnellement ou par suite de négligence en cas de perte, vol ou utilisation illicite du e-ticket.

      <strong>L'EVENEMENT</strong> : Les évènements restent et demeurent sous la seule responsabilité de l'organisateur. L'acquisition de ce e-ticket emporte le cas échéant adhésion au règlement intérieur du lieu de l'évènement et/ou de l'organisateur. En cas d'annulation ou de report de l'évènement, le remboursement de ce billet hors frais de location et frais annexes (transports, hôtellerie, etc.) sera soumis aux conditions de l'organisateur (vous trouverez son e-mail ci-dessus) qui perçoit les recettes de la vente des e-tickets.
          </small>
      </div>
    `;
    default:
      return null;
  }
};
