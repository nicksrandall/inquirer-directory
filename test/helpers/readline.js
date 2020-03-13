var EventEmitter = require('events').EventEmitter;
var sinon = require('sinon');
var util = require('util');
var _ = require('lodash');


var ReadlineStub = function() {
  this.line = '';
  this.input = new EventEmitter();
  EventEmitter.apply(this, arguments);

  var stub = {};

  Object.assign(this, {
    write: sinon.stub().returns(stub),
    moveCursor: sinon.stub().returns(stub),
    setPrompt: sinon.stub().returns(stub),
    close: sinon.stub().returns(stub),
    pause: sinon.stub().returns(stub),
    resume: sinon.stub().returns(stub),
    _getCursorPos: sinon.stub().returns({
      cols: 0,
      rows: 0
    }),
    output: {
      end: sinon.stub(),
      mute: sinon.stub(),
      unmute: sinon.stub(),
      __raw__: '',
      write: function(str) {
        this.__raw__ += str;
      }
    }
  });

};

util.inherits(ReadlineStub, EventEmitter);
//_.assign(ReadlineStub.prototype, stub);

module.exports = ReadlineStub;
