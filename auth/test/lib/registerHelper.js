/**
 * These lines are required to be able to use mailgun, and they should be called
 * before some other `import`, so we have to load it before, with an other `import` too.
 */
process.env.MAILGUN_API_KEY = 'invalid';
process.env.MAILGUN_DOMAIN = 'invalid.domain';
process.env.MAILGUN_FROM = 'invalid@email.address';
