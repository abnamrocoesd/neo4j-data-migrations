const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;

const rimraf = require('rimraf');
const Migrate = require('../src/index');

const TEST_DIR = 'chai-test';

describe('Configure', function() {

  before(() => {
    Migrate.setup(TEST_DIR);
  });

  after(() => {
    rimraf.sync(TEST_DIR);
  });

  it('should fail with no dir argument', function() {
    expect(() => { Migrate.configure() }).to.throw();
  });
  it('should succeed with regular dir', function() {
    expect(() => { Migrate.configure(TEST_DIR) }).not.to.throw();
    expect(fs.existsSync(TEST_DIR)).to.be.true;
    expect(fs.existsSync(path.join(TEST_DIR, 'configuration.js'))).to.be.true;
  });
  it('should obtain driver handle', function() {
    Migrate.configure(TEST_DIR);
    expect(Migrate).to.have.property('driver');
  });
});
