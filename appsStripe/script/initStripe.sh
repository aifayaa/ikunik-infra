#!/bin/bash

set -eo pipefail

echo "Initializing stripe environment"

# Create a account
customerEmail="fabien.rozar+fr@crowdaa.com"
customerId=$(stripe customers create --email "$customerEmail" \
    --name "frozar-fr" | grep '"id"' | cut -d'"' -f4)

echo "Customer '$customerEmail' created"
echo "customerId : $customerId"

# Create a product (create automatically the linked price)
productDescription="Abonnement pro à Crowdaa"
productId=$(stripe products create --default-price-data.currency eur \
    --default-price-data.recurring.interval month \
    --default-price-data.recurring.interval-count 1 \
    --default-price-data.tax-behavior exclusive \
    --default-price-data.unit-amount 24900 \
    --description "$productDescription" \
    --name "abonnement-pro" | grep '"id"' | cut -d'"' -f4)

echo "Product '$productDescription' created"
echo "productId : $productId"

priceId=$(stripe products retrieve $productId | grep '"default_price"' | cut -d'"' -f4)
echo "priceId : $priceId"

# Create a taxe rate FR
taxRateIdFR=$(stripe tax_rates create --country "FR" \
    --description "TVA 8.5%" \
    --display-name "TVA" \
    --inclusive false \
    --jurisdiction "FR" \
    --percentage 8.5 | grep '"id"' | cut -d'"' -f4)

echo "Tax rate FR created"
echo "taxRateIdFR : $taxRateIdFR"

# Create a taxe rate US
taxRateIdUS=$(stripe tax_rates create --country "US" \
    --description "Apply for all the US" \
    --display-name "Sales Tax" \
    --inclusive false \
    --jurisdiction "US" \
    --percentage 0 \
    --state "AL" | grep '"id"' | cut -d'"' -f4)

echo "Tax rate US created"
echo "taxRateIdUS : $taxRateIdUS"

# Create a webhook endpoint
stripe webhook_endpoints create --api-version "2024-06-20" \
    -d "enabled_events[0]"="checkout.session.completed" \
    -d "enabled_events[1]"="invoice.payment_failed" \
    -d "enabled_events[2]"="customer.subscription.deleted" \
    -d "enabled_events[3]"="customer.subscription.updated" \
    --url "https://dev-api.aws.crowdaa.com/v1/apps/webhooks/stripe" >/dev/null

echo "Webhook endpoint created"
