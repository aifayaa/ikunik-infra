# Tips and tricks

## How to listen to the stripe webhooks locally

Launch the serverless-offline server and listen the to route of the webhook:

```sh
../sls-offline.sh
# in another terminal
stripe listen --forward-to http://localhost:3000/dev/apps/webhooks/stripe
```
