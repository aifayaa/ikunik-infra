#!/bin/bash

# Logs in to docker, to increase free image download limits (because free limits are shared for a same IP, and AWS seems to share them between VMs)
# See https://www.docker.com/increase-rate-limits?utm_source=docker&utm_medium=web%20referral&utm_campaign=increase%20rate%20limit&utm_budget=
# Keep this key preciously, it can not be retrieved on the docker interface
# Account used : admin@crowdaa.com
docker login --username crowdaa --password cebf8039-3333-41d9-aca2-5872f6fd03fc
