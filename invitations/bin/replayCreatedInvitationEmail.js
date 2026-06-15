#!/usr/bin/env node
/* eslint-disable global-require, no-console */
require = require('esm')(module);

function parseArgs(argv) {
  const args = {
    stage: 'prod',
    region: 'us',
    sesRegion: 'eu-west-3',
    dashboardDomain: 'd1jmbvp87c05ud.cloudfront.net',
    redirectTo: process.env.EMAIL_SANDBOX_REDIRECT_TO,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--invitation-id') {
      args.invitationId = argv[i + 1];
      i += 1;
    } else if (arg === '--redirect-to') {
      args.redirectTo = argv[i + 1];
      i += 1;
    } else if (arg === '--dashboard-domain') {
      args.dashboardDomain = argv[i + 1];
      i += 1;
    } else if (arg === '--stage') {
      args.stage = argv[i + 1];
      i += 1;
    } else if (arg === '--region') {
      args.region = argv[i + 1];
      i += 1;
    } else if (arg === '--ses-region') {
      args.sesRegion = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function loadDefaultsFromBuildTools() {
  try {
    const settings = require('../../../ikunik-build-tools/js/settings');
    const prodUs = settings && settings.prod && settings.prod.us;
    if (prodUs && prodUs.MONGO_URL && !process.env.MONGO_URL) {
      process.env.MONGO_URL = prodUs.MONGO_URL;
    }
  } catch (error) {
    // Keep the script usable outside the isolated Ikunik workspace.
  }
}

async function main() {
  const args = parseArgs(process.argv);
  loadDefaultsFromBuildTools();

  if (!args.invitationId) {
    throw new Error('Usage: replayCreatedInvitationEmail.js --invitation-id <id>');
  }
  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is required');
  }

  process.env.EMAIL_SANDBOX_REDIRECT_TO =
    args.redirectTo || 'JimmyT@ikunikteklab.com';
  process.env.EMAIL_SANDBOX_REDIRECT_SES_REGION = args.sesRegion;
  process.env.DASHBOARD_V2_DOMAIN = args.dashboardDomain;
  process.env.STAGE = args.stage;
  process.env.CROWDAA_REGION = args.region;
  process.env.REGION = args.region === 'us' ? 'us-east-1' : args.region;

  const { replayCreatedInvitationEmail } = require('../lib/replayCreatedInvitationEmail');
  const result = await replayCreatedInvitationEmail(args.invitationId);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
