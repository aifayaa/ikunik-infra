#!/bin/bash

curl 'http://localhost:3000/dev/apps/b14a2143-faaf-4bb6-9e84-b1ac82e0a0fc' \
  -X GET \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0' \
  -H 'Accept: application/json' \
  -H 'Accept-Language: fr-FR,fr;q=0.8,en-US;q=0.5,en;q=0.3' \
  -H 'Referer: https://dev-blog.crowdaa.com/' \
  -H 'Content-Type: application/json' \
  -H 'X-Api-Key: mWELM7xAymynfNGjWJhfSbPC4FnF53AJ5wo8PE4h5k' \
  -H 'Origin: https://dev-blog.crowdaa.com' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'Authorization: Bearer UraEDn_ByL2I2Lajj52kqjZ1VNPscvPE5GvrP1d4SjU' \
  -H 'Pragma: no-cache' \
  -H 'Cache-Control: no-cache' \
  -H 'TE: trailers' | jq

echo
