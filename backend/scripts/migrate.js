#!/usr/bin/env node
'use strict';

require('dotenv').config();
const { initDatabase } = require('../src/engine/db/client');

async function main() {
  const result = await initDatabase();
  console.log(`Database ready: ${result.mode}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
