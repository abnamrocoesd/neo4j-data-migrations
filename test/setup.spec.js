const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;

const rimraf = require('rimraf');
const Migrate = require('../src/index');

const TEST_DIR = 'chai-test';

describe('Setup', function() {

  after(() => {
    // remove TEST_DIR if made.
    Migrate.destroy();
    if (fs.existsSync(TEST_DIR)) {
      rimraf.sync(TEST_DIR);
    }
  })

  it('should fail with no dir argument', function() {
    expect(() => { Migrate.setup() }).to.throw();
  });
  it('should fail with malformed dir', function() {
    expect(() => { Migrate.setup('/gurgle') }).to.throw();
    expect(fs.existsSync(TEST_DIR)).to.be.false;
  });
  it('should succeed with regular dir', function() {
    expect(() => { Migrate.setup(TEST_DIR) }).not.to.throw();
    expect(fs.existsSync(TEST_DIR)).to.be.true;
  });
  it('should fail if directory exists', function() {
    expect(() => { Migrate.setup(TEST_DIR) }).not.throw();
    expect(fs.existsSync(TEST_DIR)).to.be.true;
  });
  it('should contain default configuration file', function() {
    expect(fs.existsSync(path.join(TEST_DIR, 'configuration.js'))).to.be.true;
  });
});
