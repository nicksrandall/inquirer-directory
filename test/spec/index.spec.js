var expect = require('chai').expect;
var mock = require('mock-fs');
var ReadlineStub = require('../helpers/readline');
var Prompt = require('../../index');
var path = require('path');

describe('inquirer-directory', function() {
  var prompt;
  var rl;

  before(function () {
    mock({
      '.git': {},
      'folder1': {
        'folder1-1': {}
      },
      'zfolder2': {},
      'some.png': new Buffer([8, 6, 7, 5, 3, 0, 9]),
      'a-symlink': mock.symlink({
        path: 'folder1'
      })
    });
  });

  after(mock.restore);

  beforeEach(function() {
    rl = new ReadlineStub();
    prompt = new Prompt({
      message: 'test',
      name: 'name',
      basePath: "./"
    }, rl);
  });

  it('requires a basePath', function() {
    expect(function() {
      new Prompt({
        message: 'foo',
        name: 'name',
      });
    }).to.throw(/basePath/);
  });

  it('should list only folders an not files', function () {
      prompt.run();
      expect(rl.output.__raw__).to.contain('folder1');
      expect(rl.output.__raw__).to.contain('zfolder2');
  });

  it('should not contain folders starting with "." (private folders)', function () {
      prompt.run();
      expect(rl.output.__raw__).to.not.contain('.git');
  });

  it('should not contain files', function () {
      prompt.run();
      expect(rl.output.__raw__).to.not.contain('some.png');
  });

  it('should allow users to drill into folder', function () {
      prompt.run();
      enter();
      expect(rl.output.__raw__).to.contain('folder1-1');
  });

  it('should allow users to drill into folder', function () {
      prompt.run();
      enter();
      expect(rl.output.__raw__).to.contain('folder1-1');
  });

  it('should allow users to go back after drilling', function () {
      prompt.run();
      enter();
      expect(rl.output.__raw__).to.contain('go back');
      moveDown();
      moveDown();
      enter();
      expect(rl.output.__raw__).to.contain('zfolder2');
  });

  it('should not allow users to go back past basePath', function (done) {
    prompt.run()
      .then(function (answer) {
        expect(answer).to.equal(path.normalize('folder1/folder1-1'));
        done();
      });
    enter();
    enter();
    enter();
  });

  // it('should allow users to press keys to shortcut to that value', function (done) {
  //     prompt.run(function (answer) {
  //       expect(answer).to.equal('zfolder2');
  //       done();
  //     });
  //     keyPress('z');
  //     enter();
  //     enter();
  // });

  function keyPress(letter) {
    rl.emit('keypress', letter, {
      name: letter,
    });
  }

  function moveDown() {
    rl.emit('keypress', '', {
      name: 'down'
    });
  }

  function moveUp() {
    rl.emit('keypress', '', {
      name: 'up'
    });
  }

  function enter() {
    rl.emit('line');
  }

});
