# Deploy
Because of sharp package this ms need to be deployed with docker to work without issues.

to deploy it, execute use:
- `docker-compose run -e STAGE=dev deploy`
- or `npm run deploy:prod` || `npm run deploy:dev`

If modification has been done on packages, we need to rebuild docker services:
`docker-compose build`
