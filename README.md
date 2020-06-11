# neo4j-data-migrations

NodeJS library to allow easy data migrations for neo4j graph databases.

Inspired by (https://south.readthedocs.io/en/latest/)

# Requirements

Neo4j version 3.

Look at version 1.1 for usage with neo4j version 4.

# Installation

Install package:

`npm install neo4j-data-migrations`

Setup reference migration directory structure:

`neo4j-data-migrate --setup`

This will add a `datamigrations` directory to the current working directory. Inside, a `sample` app directory is added with an example migration script.

A connection is made to the neo4j database by means of the driver from the `neo4j-driver`. The configuration is stored in `datamigrations/configuration.js`.

Refer to (https://neo4j.com/docs/api/javascript-driver/current/function/index.html#static-function-driver) for configuration of the driver.

# Usage

## Command-line

The command-line tool is used to control the migration of the system forwards or backwards through the series of migrations for any given app.

The most common use is:

`neo4j-data-migrate myapp`

This will migrate the app myapp forwards through all the migrations. If you want to migrate all the apps at once, run:

`neo4j-data-migrate`

This has the same effect as calling the first example for every app, and will deal with dependencies properly.

You can also just give prefixes of migrations:

`neo4j-data-migrate myapp 0002`

Note that, if the system has already migrated past the specified migration, it will roll back to it instead. If you want to migrate all the way back, specify the special migration name zero:

`neo4j-data-migrate myapp zero`

## Options

The following options are available to change behaviour of the migration tool:

- `-d [path]` Path to the migrations directory.

# Adding migrations

If you want to add a data migration script, add a `.js` file with the appropriate prefix in the `datamigrations` and app (sub-)directory. You need to keep track of the increment of the prefix to ensure correct migration order.

## Migration format

Each migration file should export an anonymous object exposing three properties:
- name {String} Verbose description of the migration
- forward {async Function} Forward migration script, requires a `driver` parameter.
- backward {async Function} Backwards migration script, requires a `driver` parameter.

The `driver` parameter is used to handle neo4j migrations.

Example migration file:

```
module.exports = {
  name: 'Add users',
  forward: async (driver) => {
    driver.session();
    await session.run(
      'CREATE (user:User {name: {name}, age: {age}})',
      { name: 'Username', age: 30 },
    );
    session.close();
  },
  backward: async (driver) => {
    driver.session();
    await session.run(
      'MATCH (user:User {name: {name}}) DELETE user',
      { name: 'Username' },
    );
    session.close();
  },
};
```

# Migration metadata storage

The library keeps track of the migration schema in neo4j using nodes labeled `__dm`. Nodes are automatically created and removed by the library.

# Inclusion in continuous integration and deployment

You can include the `neo4j-data-migrate` command in the deployment script of your application. Ensure it is run before the rest of your application is started.

# API usage

It is possible to programmaticaly use the migration library by means of dependency injection. An example:

```
import Migrate from 'neo4j-data-migration';

Migrate.configure(__dirname);
Migrate.all(); // Migrate all apps at once.
Migrate.app('myapp', '0002') // Migrate myapp to 0002.
Migrate.app('myapp, 'zero') // Migrate myapp to zero.
Migrate.close();
```

# License

MIT

# Author

Remco Hendriks, ABN AMRO Bank 2019.