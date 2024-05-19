// import stripe from ('stripe')(
//   'sk_test_51LBJZKKD2Srbl7Iomp6ag5TPCImTUfKOJGxzb7MPFfgBhgaN36c0C9FHzAvUTj4kuWXRx2B5dhQamqFxKZNJAepW00vwksLCFx'
// );

import Stripe from 'stripe';

/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
// import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
// import { getInvitation } from '../lib/getInvitation';
// import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
// import { makeIdSchema } from '../../libs/schemas/makeIdSchema';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
  typescript: true,
});

const YOUR_DOMAIN = 'http://localhost:4242';

export default async (event, context, callback) => {
  const { principalId: currentUserId } =
    (event.requestContext || {}).authorizer || {};
  // let invitationId = event.pathParameters.id;
  // const { method, path } = request;
  // const logger = generateLogger({ msgPrefix: `[${method} ${path}] ` });

  // console.log('event', event);
  // console.dir(event);
  console.dir(context);
  console.dir(callback);

  try {
    // try {
    console.info(`Begin`);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
          price: 'price_1P0iF0KD2Srbl7Io3kX935WH',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/success.html`,
      cancel_url: `${YOUR_DOMAIN}/cancel.html`,
      automatic_tax: { enabled: true },
    });

    console.info(`Success`);

    console.log('session.url', session.url);

    // res.redirect(303, session.url);
    // return response.status(303).send(session.url);

    const redirectResponse = {
      status: '303',
      statusDescription: 'See Other',
      headers: {
        location: [
          {
            key: 'Location',
            value: session.url,
          },
        ],
      },
    };

    callback(null, redirectResponse);

    // } catch (err) {
    //   logger.error(JSON.stringify(err));
    //   return response.status(400).send(err);
    // }

    // return response({
    //   code: 200,
    //   body: formatResponseBody({ data: process.env.TOP_SECRET_VARIABLE }),
    // });
  } catch (error) {
    // // TODO use a logger
    return response(errorMessage({ message: error.message }));
  }
};
