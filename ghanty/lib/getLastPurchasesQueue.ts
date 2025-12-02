import {
  ServiceBusClient,
  ServiceBusReceivedMessage,
} from '@azure/service-bus';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_NOT_FOUND,
  PANIC_CODE,
} from '@libs/httpResponses/errorCodes';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { objGet } from '@libs/utils';
import { ghantyDisabledAccounts } from './ghantyUtils';

const { COLL_APPS, COLL_GHANTY_MYFID_USERS_STARS } = mongoCollections;

type GhantyServiceBusTicketType = {
  IdTicket: string;
  NumeroTicket: string;
  NumeroCaisse: string;
  Date: string;
  NumeroClient: string;
  GroupeClient: string;
  TelephoneClient: string | null;
  CodeEnseigne: string;
  CodeMagasin: string;
  LibelleMagasin: null;
  LibelleEnseigne: null;
  ChiffreAffaireTTC: number;
  QuantiteArticle: number;
  Devise: string;
  CanalVente: string;
  MontantTotalRemise: number;
  MontantTotalPromotionTTC: number;
  CumulRemisePromo: number;
  Vendeur: string;
  HoroDate: string | null;
  Articles: Array<{
    CodeArticle: string;
    IdArticle: string;
    AltIdArticle: string | null;
    NumeroLigne: number;
    CodeEAN: string;
    LibelleArticle: string;
    Retour: false;
    Quantite: number;
    TauxTVA: number;
    MontantVenteTVA: number;
    MontantVenteHT: number;
    Unite: string;
    MontantVenteTTC: number;
    MontantRemiseManuelleTTC: number;
    MontantPromoAutoTTC: number;
    PrixVenteUnitaireTTC: number;
    CumulRemisePromoTTC: number;
    RefPromo: string;
    RefRemise: string;
    DonneeComplementaire: string;
    MotifAnnulation: string | null;
    Date: string | null;
  }>;
  Paiements: Array<{
    CodeMoyenPaiement: string;
    LibelleMoyenPaiement: string;
    MontantReglement: number;
    Quantite: number;
    DonneeComplementaire: string;
    NumeroLigne: number;
    MontantLivraison: number;
  }>;
};

const LAMBDA_TIMEOUT = (300 - 60) * 1000; // TImeout with a safety margin

export async function processQueue(
  connectionString: string,
  topicName: string,
  subscriptionName: string,
  appId: string,
  db: any
) {
  const endProcessingAt = new Date(Date.now() + LAMBDA_TIMEOUT);
  const sbClient = new ServiceBusClient(connectionString);

  // If receiving from a subscription you can use the createReceiver(topicName, subscriptionName) overload
  // instead.
  const queueReceiver = sbClient.createReceiver(topicName, subscriptionName);

  // To receive messages from sessions, use getSessionReceiver instead of getReceiver or look at
  // the sample in sessions.ts file
  try {
    let messages: Array<ServiceBusReceivedMessage> = [];
    const ticketsUsers: Record<string, true> = {};
    let processedMessages = 0;
    let badUsers = 0;

    do {
      messages = await queueReceiver.receiveMessages(10, {
        maxWaitTimeInMs: 5 * 1000,
      });

      if (messages.length > 0) {
        for (let message of messages) {
          const body: GhantyServiceBusTicketType = message.body;

          if (ghantyDisabledAccounts.includes(body.NumeroClient)) {
            badUsers += 1;
          } else {
            ticketsUsers[body.NumeroClient] = true;
          }

          await queueReceiver.completeMessage(message);

          processedMessages += 1;
        }
      }
    } while (messages.length > 0 && Date.now() < endProcessingAt.getTime());

    const toProcessUsers = Object.keys(ticketsUsers);

    for (let username of toProcessUsers) {
      const userStars = await db
        .collection(COLL_GHANTY_MYFID_USERS_STARS)
        .findOne({ username });

      if (userStars) {
        await db.collection(COLL_GHANTY_MYFID_USERS_STARS).updateOne(
          { _id: userStars._id },
          {
            $set: {
              inputAt: new Date(),
              requiresUpdate: true,
            },
          }
        );
      } else {
        await db
          .collection(COLL_GHANTY_MYFID_USERS_STARS)
          .insertOne({ username, inputAt: new Date(), requiresUpdate: true });
      }
    }

    return {
      processedUsers: toProcessUsers.length,
      processedMessages,
      badUsers,
      dateIsOk: Date.now() < endProcessingAt.getTime(),
    };
  } finally {
    await queueReceiver.close();
    await sbClient.close();
  }
}

export default async (appId: string) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `App with ID ${appId} not found!`
      );
    }

    const azureCredentials = objGet(
      app,
      'settings.myFidAzure.serviceBus.transactions',
      null
    ) as {
      connectionString: string;
      topicName: string;
      subscriptionName: string;
    } | null;
    if (!azureCredentials) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        PANIC_CODE,
        `Missing data for app ${appId}, cannot find credentials!`
      );
    }
    const { connectionString, topicName, subscriptionName } = azureCredentials;

    const result = await processQueue(
      connectionString,
      topicName,
      subscriptionName,
      appId,
      client.db()
    );

    return result;
  } finally {
    await client.close();
  }
};
