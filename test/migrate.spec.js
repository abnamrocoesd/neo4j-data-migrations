const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;
var sinon = require('sinon');

const rimraf = require('rimraf');
const Migrate = require('../src/index');

const TEST_DIR = 'chai-test';

describe('Configure', function() {

  before(() => {
    Migrate.setup(TEST_DIR);
    Migrate.configure('test/mock');
  });

  after(() => {
    // remove TEST_DIR if made.
    Migrate.destroy();
    if (fs.existsSync(TEST_DIR)) {
      rimraf.sync(TEST_DIR);
    }
  });

  it('should forward all', async function() {
    const number = await Migrate.all();
    expect(number).to.equal(4);
    const status = await Migrate.status('actors');
    expect(status[0].migration).to.equal('0001');
    expect(status[1].migration).to.equal('0002');
    expect(status[2].migration).to.equal('0003');
    expect(status[3].migration).to.equal('0004');
  });

  it('should forward all, be up-to-date', async function() {
    const number = await Migrate.all();
    expect(number).to.equal(0);
    const status = await Migrate.status('actors');
    expect(status[0].migration).to.equal('0001');
    expect(status[1].migration).to.equal('0002');
    expect(status[2].migration).to.equal('0003');
    expect(status[3].migration).to.equal('0004');
  });


  it('should backward actors to zero', async function() {
    const number = await Migrate.app('actors', 'zero');
    expect(number).to.equal(4);
    const status = await Migrate.status('actors');
    expect(status.length).to.equal(0);
  });

  it('should not forward an app with bad prefix', async function () {
    const status = await Migrate.app('actors', 'fake');
    expect(status).to.equal(0);
  });

  it('should forward actors to 3', async function () {
    const number = await Migrate.app('actors', '3');
    expect(number).to.equal(3);
    const status = await Migrate.status('actors');
    expect(status[0].migration).to.equal('0001');
    expect(status[1].migration).to.equal('0002');
    expect(status[2].migration).to.equal('0003');
  });

  it('should backward actors to 1', async function () {
    const number = await Migrate.app('actors', '1');
    expect(number).to.equal(2);
    const status = await Migrate.status('actors');
    expect(status[0].migration).to.equal('0001');
  });

  it('should forward to 2', async function () {
    const number = await Migrate.app('actors', '2');
    expect(number).to.equal(1);
    const status = await Migrate.status('actors');
    expect(status[0].migration).to.equal('0001');
    expect(status[1].migration).to.equal('0002');
  });

  it('shoud not be able to load malformed migration', async function () {
    fs.copyFileSync(
      path.join(__dirname, 'mock-faulty', '0005_add_prizes.js'),
      path.join(__dirname, 'mock', 'actors', '0005_add_prizes.js'),
    );
    const number = await Migrate.app('actors', '5');
    expect(number).to.equal(0);
    rimraf.sync(path.join(__dirname, 'mock', 'actors', '0005_add_prizes.js'));
  });

  it('shoud not be able to load incompatible migration', async function () {
    fs.copyFileSync(
      path.join(__dirname, 'mock-faulty', '0006_add_tickets.js'),
      path.join(__dirname, 'mock', 'actors', '0006_add_tickets.js'),
    );
    const number = await Migrate.app('actors', '6');
    expect(number).to.equal(0);
    rimraf.sync(path.join(__dirname, 'mock', 'actors', '0006_add_tickets.js'));
  });

  it('should be in a state where the db is ahead of the files', async function () {
    let number = await Migrate.app('actors', '4');
    expect(number).to.equal(2);
    fs.renameSync(
      path.join(__dirname, 'mock', 'actors', '0004_add_venues.js'),
      path.join(__dirname, 'mock', 'temp_0004_add_venues.js'),
    );
    number = await Migrate.app('actors', '4');
    expect(number).to.equal(0);
    fs.renameSync(
      path.join(__dirname, 'mock', 'temp_0004_add_venues.js'),
      path.join(__dirname, 'mock', 'actors', '0004_add_venues.js'),
    );
  });

  it('should close the driver', function () {
    const close = Migrate.close();
    expect(close).to.be.true;
  })
});
