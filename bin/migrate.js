#!/usr/bin/env node

import program from 'commmander';
import pkg from '../package.json';
import Migrate from '../src/index';

program
  .version(pkg.version)
  .command('neo4j-data-migration <app> <prefix>')
  .option('-s, --setup', 'Setup data migrations')
  .option('-d, --dir [path]', 'Path to data migrations directory', 'datamigrations')
  .parse(process.argv);

if (program.setup) {
  Migrate.setup();
}
