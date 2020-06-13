// in-memory migration status DB
let migrations = {};

/**
 * Mock Neo4j driver configuration
 *
 * Return: mock configured neo4j driver.
 */
module.exports = () => ({
  session: () => ({
    run: async (query, args) => {
      if (query.startsWith('MATCH') && query.endsWith('DELETE m')) {
        // remove migration
        if (!migrations[args.appName]) {
          migrations[args.appName] = [];
        }

        const i = migrations[args.appName].indexOf(args.migration);
        if (i > -1) {
          migrations[args.appName].splice(i, 1);
        }
        return;
      }

      if (query.startsWith('MATCH')) {
        // migration status
        let dbMigrations = migrations[args.appName];
        if (dbMigrations && dbMigrations.length > -1) {
          dbMigrations = dbMigrations.map(m => ({
            get: () => ({
              migration: m,
              app: args.appName,
            }),
          }));
        }

        return {
          records: dbMigrations || [],
        };
      }

      if (query.startsWith('CREATE')) {
        // new migration
        if (!migrations[args.appName]) {
          migrations[args.appName] = [];
        }
        migrations[args.appName].push(args.migration);
        return;
      }
    },
    close: () => (true),
  }),
  close: () => (true),
});
