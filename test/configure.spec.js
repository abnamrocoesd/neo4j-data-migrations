const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;

const rimraf = require('rimraf');
const Migrate = require('../src/index');

const TEST_DIR = 'chai-test';

const configPath = path.join(TEST_DIR, 'configuration.js');

describe('Configure', function() {

  beforeEach(() => {
    Migrate.setup(TEST_DIR);
  });

  afterEach(() => {
    // remove TEST_DIR if made.
    Migrate.destroy();
    if (fs.existsSync(TEST_DIR)) {
      rimraf.sync(TEST_DIR);
    }
  });

  it('should fail with no dir argument', function() {
    expect(() => { Migrate.configure() }).to.throw();
  });

  it('should succeed with regular dir', function() {
    expect(() => { Migrate.configure(TEST_DIR) }).not.to.throw();
    expect(fs.existsSync(TEST_DIR)).to.be.true;
    expect(fs.existsSync(configPath)).to.be.true;
  });

  it('should fail to obtain driver handle if no configuration file is there.', function() {
    const configure = Migrate.configure('bogus');
    expect(configure).to.be.false;
    expect(Migrate.driver).to.be.false;
  });

  it('should fail to obtain driver handle if configuration file is faulty.', function() {
    const configure = Migrate.configure('test/mock-faulty');
    expect(configure).to.be.false;
    expect(Migrate.driver).to.be.false;

  });

  it('should obtain driver handle', function() {
    Migrate.configure(TEST_DIR);
    expect(Migrate).to.have.property('driver');
  });
});
