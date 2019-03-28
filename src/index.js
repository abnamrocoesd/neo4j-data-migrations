const assert = require('assert');
const setup = require('./setup');

module.exports = {
  configure: () => {},
  setup,
  app: (app, prefix) => {
    assert.ok(app);
    console.log(`migrate ${app}`);
    if (prefix) {
      console.log(`towards ${prefix}`);
    }
  },
  all: () => {
    console.log('migrate all');
  },
};
