const fs = require('fs');
const path = require('path');
const assert = require('assert');

const FILE_NAME_REGEX = /^(\d+)_\S+\.js$/;

/**
 * Gets migration status for a given app.
 * @param {*} driver neo4j bolt driver
 * @param {*} appName app to check migration status for
 * @returns object with keys: app, migration.
 */
async function migrationStatus(driver, appName) {
  const session = driver.session();
  const migrationHistory = await session.run(
    'MATCH (m:__dm {app: {appName} }) RETURN PROPERTIES(m) AS migration',
    { appName },
  );
  session.close();
  return migrationHistory.records
    .map(record => record.get('migration'))
    .sort((a, b) => a.migration.localeCompare(b.migration));
}

/**
 * Inserts a migration node into the DB
 * @param {*} driver neo4j bolt driver
 * @param {*} appName app to add migation node for
 * @param {*} migration the migration number
 * @returns none
 */
async function forwardMigration(driver, appName, migration) {
  const session = driver.session();
  await session.run(
    'CREATE (m:__dm {app: {appName}, migration: {migration}})',
    { appName, migration },
  );
  session.close();
}

/**
 * Removes a migration node from the DB
 * @param {*} driver neo4j bolt driver
 * @param {*} appName app to add migation node for
 * @param {*} migration the migration number
 * @returns none
 */
async function backwardMigration(driver, appName, migration) {
  const session = driver.session();
  await session.run(
    'MATCH (m:__dm {app: {appName}, migration: {migration}}) DELETE m',
    { appName, migration },
  );
  session.close();
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
 * Injects the migration file.
 * @param {String} path absolute path to migration file
 */
function loadFile(filePath) {
  let file = false;
  try {
    file = require(filePath); // eslint-disable-line global-require, import/no-dynamic-require, max-len
  } catch (err) {
    console.error(`Failed to load migration file ${filePath}`);
    console.error('Error information:');
    console.error(err);
    return false;
  }

  if (
    !Object.prototype.hasOwnProperty.call(file, 'forward')
    || !Object.prototype.hasOwnProperty.call(file, 'backward')
  ) {
    console.error(`Failed to prepare migration file ${filePath}`);
    console.error('Forward and / or backward function not found.');
    return false;
  }
  return file;
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
    console.error(err);
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
 * Destroys Migrate instance, resetting properties.
 */
Migrate.prototype.destroy = function () {
  this.configPath = '';
  this.driver = false;
}


/**
 * Forwards all migrations for all apps.
 */
Migrate.prototype.all = async function () {
  assert(this.configPath);

  for (let i = 0; i < this.apps.length; i += 1) {
    await this.app(this.apps[i]); // eslint-disable-line no-await-in-loop
  }
};

/**
 * Forwards or backwards `appName` to optional `prefix` migration.
 * @param {String} appName the app to migrate forward
 * @param {String} prefix the prefix number to migrate to
 */
Migrate.prototype.app = async function (appName, prefix) {
  assert(this.configPath);

  // If a prefix is supplied, it must be any string of digits or string 'zero'.
  if (prefix && !prefix.match(/^(\d+)|zero$/)) {
    console.error('Prefix is not a number or \'zero\'. Exiting.');
    return false;
  }

  const dbMigrationStatus = await migrationStatus(this.driver, appName);
  const migrationFiles = readFiles(path.join(this.configPath, appName));
  const dbTip = dbMigrationStatus[dbMigrationStatus.length - 1] || { migration: '0' }; // latest migration in DB
  const filesTip = migrationFiles[migrationFiles.length - 1]; // latest file migration
  const tipDiff = dbTip.migration.localeCompare(filesTip.migration);
  let target = filesTip;
  let direction = 0;
  let migrations = [];

  if (!prefix) {
    target = filesTip.migration;
  } else {
    // default format of prefix is four digits with leading zero's.
    target = prefix.padStart(4, 0);
  }

  // 'zero' means to revert everything, which is not at migration 0, but before 0.
  if (prefix === 'zero') {
    target = '-1';
  }

  // is -1 for backwards, 1 for forwards, 0 for up-to-date
  direction = target.localeCompare(dbTip.migration);

  // if the DB is ahead of the migration files, do nothing.
  if (tipDiff > 0) {
    console.info(`App '${appName}' is ahead of the migration files.`);
    console.info(`Tip of migration history: ${dbTip.migration}, tip of migration files: ${filesTip.migration}`);
    return true;
  }

  // Either up-to-date or target is identical to tip.
  if (direction === 0) {
    console.info(`App '${appName}' is up-to-date at ${dbTip.migration}.`);
    return true;
  }

  // migrate forwards.
  if (direction > 0) {
    migrations = migrationFiles
      .filter(file => file.migration > dbTip.migration && file.migration <= target);
  }

  // migrate backwards.
  if (direction < 0) {
    migrations = migrationFiles
      .filter(file => file.migration <= dbTip.migration && file.migration > target)
      .reverse();
  }

  // inject files and check for consistency.
  migrations = migrations.map((file) => {
    file.fn = loadFile(path.resolve(this.configPath, appName, file.file));
    return file;
  });

  // all migration files must be in correct format, to prevent faulty intermittent states.
  if (migrations.find(file => file.fn === false)) {
    console.error('One or more migration files are incompatible. Check error messages above. Exiting.');
    return false;
  }

  console.info(`Running migrations for '${appName}'.`);
  console.info(`Current migration: ${dbTip.migration}, target migration: ${target}`);
  if (direction > 0) {
    console.info('Forwarding migrations...');
  } else {
    console.info('Backwarding migrations...');
  }

  for (let i = 0; i < migrations.length; i += 1) {
    /* eslint-disable no-await-in-loop */
    const migration = migrations[i];
    console.info(` - ${migration.migration}: ${migration.fn.name}`);
    if (direction > 0) {
      await migration.fn.forward(this.driver);
      await forwardMigration(this.driver, appName, migration.migration);
    } else {
      await migration.fn.backward(this.driver);
      await backwardMigration(this.driver, appName, migration.migration);
    }
    /* eslint-enable no-await-in-loop */
  }

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
