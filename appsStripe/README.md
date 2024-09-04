# To launch the webhook localy

In a terminal, launch the serverless-offline server:

```sh
../sls-offline.sh
```

In another terminal, launch the Stripe CLI:

```sh
stripe listen --events invoice.payment_failed,checkout.session.completed,customer.subscription.updated,customer.subscription.deleted --load-from-webhooks-api --forward-to localhost:3000
```

# To use Stripe in production environment

We have to setup the production environment with the following information:

- [x] have a stripe secret key
- [x] fill the right URL for webhook in Stripe production environment
- [x] have a webhook secret key
- [x] have a price id for the pro feature plan
- [x] have a tax rate id FR
- [x] have a tax rate id US
