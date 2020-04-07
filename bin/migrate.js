#!/usr/bin/env node

const program = require('commander');
const pkg = require('../package.json');
const Migrate = require('../src');

(() => {
  program
    .version(pkg.version)
    .option('-s, --setup', 'Setup data migrations')
    .option('-d, --dir [path]', 'Path to data migrations directory', './datamigrations')
    .parse(process.argv);

  if (program.setup) {
    return Migrate.setup(program.dir);
  }

  // Configure migrate instance
  if (!Migrate.configure(program.dir)) {
    return false;
  }

  if (!program.args.length) {
    // Forward all apps
    return Migrate.all()
      .then(() => { Migrate.close(); })
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }

  if (program.args.length === 1) {
    // Forward specific app
    return Migrate.app(program.args[0])
      .then(() => { Migrate.close(); })
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }

  if (program.args.length === 2) {
    // Migrate specific app to point
    return Migrate.app(program.args[0], program.args[1])
      .then(() => { Migrate.close(); })
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }

  return true;
})();
