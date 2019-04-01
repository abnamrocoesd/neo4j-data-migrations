const fs = require('fs');
const path = require('path');
const assert = require('assert');

const FILE_NAME_REGEX = /^(\d+)_\S+\.js$/;

async function migrationStatus(driver, appName) {
  const session = driver.session();
  const migrationHistory = await session.run('MATCH (m:__dm {app: {appName} }) RETURN PROPERTIES(m) AS migration', { appName });
  session.close();
  return migrationHistory.records
    .map(record => record.get('migration'))
    .sort((a, b) => a.migration.localeCompare(b.migration));
}

/**
 * Reads out the base directory for other directories
 * @param {String} dir absolute path to migrations directory
 * @returns {[String]} directory names
 */
function readDirs(dir) {
  return fs.readdirSync(dir)
    .filter(file => fs.statSync(path.join(dir, file)).isDirectory());
}

/**
 * Reads out a subdirectory for migration files.
 * Files must be in following file name format: [digit]_[verbose].js
 * Example: 0001_add_users.js
 * @param {String} dir absolute path to migration app directory
 * @returns {[String]} sorted array of tuples in format [prefix, filename]
 */
function readFiles(dir) {
  return fs.readdirSync(dir)
    .filter(file => !fs.statSync(path.join(dir, file)).isDirectory()
      && file.match(FILE_NAME_REGEX))
    .map(file => ({ migration: file.match(FILE_NAME_REGEX)[1], file }))
    .sort((a, b) => a.migration.localeCompare(b.migration));
}

/**
 * Initialize a new `Migrate` instance.
 */

function Migrate() {
  this.DEFAULT_CONFIG_PATH = path.join(__dirname, 'defaults', 'default.configuration.js');
  this.configPath = '';
  this.driver = false;
}

/**
 * Sets up a new migration directory with default neo4j bolt configuration.
 * @param {String} dir path to migrations directory
 * @returns {bool}
 */

Migrate.prototype.setup = function (dir) {
  assert.ok(dir);

  console.info('Setup data migrations');
  if (fs.existsSync(dir)) {
    console.error(`Directory ${dir} already exists. Exiting.`);
    return false;
  }

  fs.mkdirSync(dir);
  fs.copyFileSync(this.DEFAULT_CONFIG_PATH, path.join(dir, 'configuration.js'));
  console.info(`Added migrations directory and default configuration at ${dir}`);
  return true;
};

/**
 * Configures the neo4j bolt driver.
 * @param {String} dir path to migrations directory
 * @returns {bool}
 */

Migrate.prototype.configure = function (dir) {
  assert.ok(dir);
  const configPath = path.resolve(dir, 'configuration.js');
  if (!fs.existsSync(configPath)) {
    console.error(`Invalid path ${dir}. Exiting.`);
    return false;
  }

  try {
    this.driver = require(configPath)(); // eslint-disable-line global-require, import/no-dynamic-require, max-len
  } catch (err) {
    console.error(`Failed to load configuration at ${configPath}. Exiting.`);
    console.error('Error information:');
    console.error(err.trace);
    return false;
  }

  this.configPath = dir;
  this.apps = readDirs(dir);
  return true;
};

/**
 * Closes the neo4j bolt driver.
 */

Migrate.prototype.close = function () {
  this.driver.close();
  return true;
};

/**
 * Forwards all migrations for all apps.
 */

Migrate.prototype.all = async function () {
  assert(this.configPath);
  console.log('Migrate all');
  console.log(this.apps);
};

/**
 * Forwards or backwards `appName` to optional `prefix` migration.
 * @param {String} appName the app to migrate forward
 * @param {String} prefix the prefix number to migrate to
 */

Migrate.prototype.app = async function (appName, prefix) {
  assert(this.configPath);

  if (!prefix || !prefix.match(/^(\d+)|zero$/)) {
    console.error('Prefix is not a number or \'zero\'. Exiting.');
    return false;
  }

  const dbMigrationStatus = await migrationStatus(this.driver, appName);
  const migrationFiles = readFiles(path.join(this.configPath, appName));
  const dbTip = dbMigrationStatus[dbMigrationStatus.length - 1];
  const filesTip = migrationFiles[migrationFiles.length - 1];
  const tipDiff = dbTip.migration.localeCompare(filesTip.migration);
  let target = filesTip;

  if (prefix) {
    target = prefix;
  }

  if (prefix === 'zero') {
    target = -1;
  }

  if (tipDiff > 0) {
    console.info(`App '${appName}' is ahead of the migration files.`);
    console.info(`Tip of migration history: ${dbTip.migration}, tip of migration files: ${filesTip.migration}`);
    return true;
  }

  if (tipDiff === 0) {
    console.info(`App '${appName}' is up-to-date at ${dbTip.migration}.`);
    return true;
  }

  console.info(`Running migrations for '${appName}'.`);
  console.info(`Current migration: ${dbTip.migration}, target migration: ${prefix}`);


  return true;
};

/**
 * Expose the root command.
 */

module.exports = new Migrate();

/**
 * Export `Migrate`
 */

exports.Migrate = Migrate;
