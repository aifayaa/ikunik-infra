#!/bin/bash

# Logs in to docker, to increase free image download limits (because free limits are shared for a same IP, and AWS seems to share them between VMs)
# Keep this key preciously, it can not be retrieved on the docker interface
# Account used : admin@crowdaa.com
docker login --username crowdaa --password cebf8039-3333-41d9-aca2-5872f6fd03fc
