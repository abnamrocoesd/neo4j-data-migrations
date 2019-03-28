const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DEFAULT_CONFIG_PATH = path.join(__dirname, 'defaults', 'default.configuration.js');

/**
 * setup(dir)
 * - dir [string]: path to migrations directory
 *
 */

module.exports = (dir) => {
  assert.ok(dir);

  console.info('Setup data migrations');
  if (fs.existsSync(dir)) {
    console.error(`Directory ${dir} already exists. Exiting.`);
    return;
  }

  fs.mkdirSync(dir);
  fs.copyFileSync(DEFAULT_CONFIG_PATH, path.join(dir, 'configuration.js'));
  console.info(`Added migrations directory and default configuration at ${dir}`);
};
