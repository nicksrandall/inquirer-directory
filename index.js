/**
 * `directory` type prompt
 */

//core
var assert = require('assert');
var path = require('path');
var fs = require('fs');

//npm
var rx = require('rx-lite');
var _ = require('lodash');
var util = require('util');
var chalk = require('chalk');
var figures = require('figures');
var cliCursor = require('cli-cursor');
var Base = require('inquirer/lib/prompts/base');
var observe = require('inquirer/lib/utils/events');
var Paginator = require('inquirer/lib/utils/paginator');
var Choices = require('inquirer/lib/objects/choices');
var Separator = require('inquirer/lib/objects/separator');

/**
 * Module exports
 */

module.exports = Prompt;

/**
 * Constants
 */
var CHOOSE_DIRECTORY = 'choose this directory';
var BACK = 'go back a directory';

// stores what index to use for a path if you go back a directory

/**
 * Constructor
 */


function Prompt () {
  Base.apply(this, arguments);

  if (!this.opt.basePath) {
    this.throwParamError('basePath');
  }

  this.pathIndexHash = {};
  this.originalBaseDir = this.currentPath =
    path.normalize(path.isAbsolute(this.opt.basePath) ?
      path.resolve(this.opt.basePath) : path.resolve(process.cwd(), this.opt.basePath));

  if (String(this.currentPath).endsWith(path.sep)) {
    this.currentPath = String(this.currentPath).slice(0, -1);
  }

  this.onlyOneFile = !!this.opt.onlyOneFile;

  this.opt.choices = new Choices(this.createChoices(this.currentPath), this.answers);
  this.selected = 0;

  if (this.opt.filterItems) {
    assert(typeof this.opt.filterItems === 'function', ' "filterItems" option property must be a function.');
  }

  this.firstRender = true;

  // Make sure no default is set (so it won't be printed)
  this.opt.default = null;
  this.searchTerm = '';
  this.paginator = new Paginator();
}

util.inherits(Prompt, Base);

/**
 * Start the Inquiry session
 * @param  {Function} cb      Callback when prompt is done
 * @return {this}
 */

Prompt.prototype._run = function (cb) {
  var self = this;
  self.searchMode = false;
  this.done = cb;
  var alphaNumericRegex = /\w|\.|\-/i;
  var events = observe(this.rl);

  var keyUps = events.keypress.filter(function (e) {
    return e.key.name === 'up' || (!self.searchMode && e.key.name === 'k');
  }).share();

  var keyDowns = events.keypress.filter(function (e) {
    return e.key.name === 'down' || (!self.searchMode && e.key.name === 'j');
  }).share();

  var keyLefts = events.keypress.filter(function (e) {
    return e.key.name === 'left';
  }).share();

  var keyRights = events.keypress.filter(function (e) {
    return e.key.name === 'right';
  }).share();

  var keySlash = events.keypress.filter(function (e) {
    return e.value === '/';
  }).share();

  // var keyMinus = events.keypress.filter(function (e) {
  //   return e.value === '-';
  // }).share();

  var alphaNumeric = events.keypress.filter(function (e) {
    return e.key.name === 'backspace' || alphaNumericRegex.test(e.value);
  }).share();

  var searchTerm = keySlash.flatMap(function (md) {
    self.searchMode = true;
    self.searchTerm = '';
    self.render();
    var end$ = new rx.Subject();
    var done$ = rx.Observable.merge(events.line, end$);
    return alphaNumeric.map(function (e) {
      if (e.key.name === 'backspace' && self.searchTerm.length) {
        self.searchTerm = self.searchTerm.slice(0, -1);
      } else if (e.value) {
        self.searchTerm += e.value;
      }
      if (self.searchTerm === '') {
        end$.onNext(true);
      }
      return self.searchTerm;
    })
      .takeUntil(done$)
      .doOnCompleted(function () {
        self.searchMode = false;
        self.render();
        return false;
      });
  }).share();

  var outcome = this.handleSubmit(events.line);
  // outcome.drill.forEach(this.handleDrill.bind(this));
  // outcome.back.forEach(this.handleBack.bind(this));

  keyUps.takeUntil(outcome.done).forEach(this.onUpKey.bind(this));
  keyDowns.takeUntil(outcome.done).forEach(this.onDownKey.bind(this));

  keyLefts.takeUntil(outcome.done).forEach(this.handleBack.bind(this));
  keyRights.takeUntil(outcome.done).forEach(this.handleDrill.bind(this));

  // keyMinus.takeUntil(outcome.done).forEach(this.handleBack.bind(this));
  events.keypress.takeUntil(outcome.done).forEach(this.hideKeyPress.bind(this));
  searchTerm.takeUntil(outcome.done).forEach(this.onKeyPress.bind(this));
  outcome.done.forEach(this.onSubmit.bind(this));

  // Init the prompt
  cliCursor.hide();
  this.render();

  return this;
};


Prompt.prototype.render = function (msg) {

  var message = (msg) || '';

  if (this.firstRender && this.status !== 'answered') {
    message += this.getQuestion();
    message += chalk.dim('(Use arrow keys)');
  }
  else {
    message += '\n'
  }

  if (this.status === 'answered') {

    message += chalk.magenta(path.join(this.currentPath, this.selectedValue));

  }
  else {

    message += '\n\n' + chalk.bold(' Current directory: ') + chalk.black(path.join(this.currentPath, '/../'))
      + chalk.magenta(path.basename(this.currentPath));

    var choicesStr = listRender(this.opt.choices, this.selected);
    message += '\n\n\n' + this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize);

    if (this.searchMode) {
      message += ('\n\n => Search: ' + this.searchTerm);
    } else {
      message += '\n\n (Use \'/\' key to search this directory)';
    }
  }

  this.firstRender = false;
  this.screen.render(message);
};

/**
 * When user press `enter` key
 */
Prompt.prototype.handleSubmit = function (e) {

  var self = this;

  var obx = e.map(function () {

    var val;
    if (val = self.opt.choices.getChoice(self.selected).value) {
      self.selectedValue = val;
      return val;
    }
  }).share();

  // here is a hack, but it seems to work
  var done = obx.filter(function (choice) {
    // return choice === self.currentPath;

    _interactiveDebug('choice => ', choice);
    choice = path.isAbsolute(choice) ? choice : path.resolve(self.currentPath + path.sep + choice);
    if (self.onlyOneFile && !fs.statSync(choice).isFile()) {
      self.render(' In this case, you must select a file (not a directory).');
      return false;
    }

    return true;
  }).take(1);

  // var back = obx.filter(function (choice) {
  //   return choice === BACK;
  // }).takeUntil(done);
  //
  // var drill = obx.filter(function (choice) {
  //   return choice !== BACK && choice !== CHOOSE_DIRECTORY;
  // }).takeUntil(done);

  return {
    done: done,
    // back: back,
    // drill: drill
  };
};

/**
 *  when user selects to drill into a folder (by selecting folder name)
 */
Prompt.prototype.handleDrill = function () {

  this.pathIndexHash[ this.currentPath ] = this.selected;

  var choice = this.opt.choices.getChoice(this.selected);
  this.currentPath = path.normalize(path.isAbsolute(choice.value) ? choice.value : path.join(this.currentPath, choice.value));

  if (String(this.currentPath).endsWith(path.sep)) {
    this.currentPath = String(this.currentPath).slice(0, -1);
  }

  if (fs.statSync(this.currentPath).isFile()) {
    this.opt.choices = new Choices(this.createChoices(this.currentPath), this.answers);
    this.selected = this.pathIndexHash[ this.currentPath ] || 0;
  }
  else {
    this.opt.choices = new Choices(this.createChoices(this.currentPath), this.answers);
    this.selected = this.pathIndexHash[ this.currentPath ] || 0;
    this.render();
  }

};

/**
 * when user selects '.. back'
 */
Prompt.prototype.handleBack = function () {

  if (!this.opt.allowNavigationAboveBaseDir) {
    if (this.currentPath === this.originalBaseDir) {
      return;
    }
  }

  var choice = this.opt.choices.getChoice(this.selected);
  // this.currentPath = path.dirname(this.currentPath);
  this.pathIndexHash[ this.currentPath ] = this.selected;

  this.currentPath = path.normalize(path.join(this.currentPath, '/../'));
  if (String(this.currentPath).endsWith(path.sep)) {
    this.currentPath = String(this.currentPath).slice(0, -1);
  }

  this.opt.choices = new Choices(this.createChoices(this.currentPath), this.answers);
  this.selected = this.pathIndexHash[ this.currentPath ] || 0;
  this.render();
};

Prompt.prototype.onSubmit = function (value) {

  const potentialDoneVal = path.join(this.currentPath, this.selectedValue);
  if (this.onlyOneFile && !fs.statSync(potentialDoneVal).isFile()) {
    this.render(' In this case, you must select a file (not a directory).');
  }
  else {
    this.status = 'answered';
    this.render();
    this.screen.done();
    cliCursor.show();
    this.done(potentialDoneVal);
  }

};

Prompt.prototype.hideKeyPress = function () {
  if (!this.searchMode) {
    if (fs.statSync(this.currentPath).isFile()) {
      this.render('file');   // not currently used
    }
    else {
      this.render();
    }

  }
};

Prompt.prototype.onUpKey = function () {
  var len = this.opt.choices.realLength;
  this.selected = (this.selected > 0) ? this.selected - 1 : len - 1;
  this.render();
};

Prompt.prototype.onDownKey = function () {
  var len = this.opt.choices.realLength;
  this.selected = (this.selected < len - 1) ? this.selected + 1 : 0;
  this.render();
};

Prompt.prototype.onSlashKey = function (e) {
  this.render();
};

Prompt.prototype.onKeyPress = function (e) {
  var index = findIndex.call(this, this.searchTerm);
  if (index >= 0) {
    this.selected = index;
  }
  this.render();
};

function findIndex (term) {
  var item;
  for (var i = 0; i < this.opt.choices.realLength; i++) {
    item = this.opt.choices.realChoices[ i ].name.toLowerCase();
    if (item.indexOf(term) === 0) {
      return i;
    }
  }
  return -1;
}

/**
 * Helper to create new choices based on previous selection.
 */
Prompt.prototype.createChoices = function (basePath) {
  return getDirectories(basePath, this.opt.includeFiles, this.opt.filterItems);
};

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
function listRender (choices, pointer) {
  var output = '';
  var separatorOffset = 0;

  choices.forEach(function (choice, i) {
    if (choice.type === 'separator') {
      separatorOffset++;
      output += '  ' + choice + '\n';
      return;
    }

    var isSelected = (i - separatorOffset === pointer);
    var line = (isSelected ? figures.pointer + ' ' : '  ') + choice.name;
    if (isSelected) {
      line = chalk.cyan(line);
    }
    output += line + ' \n';
  });

  return output.replace(/\n$/, '');
}

function allOK () {
  return true;
}

/**
 * Function for getting list of folders in directory
 * @param  {String} basePath the path the folder to get a list of containing folders
 * @return {Array}           array of folder names inside of basePath
 */
function getDirectories (basePath, includeFiles, userSuppliedFilterFn) {

  var items;
  try {
    items = fs.readdirSync(basePath);
  }
  catch (err) {

    // probably a file not a dir, but let's check error message to be sure
    if (includeFiles && String(err.stack).match(/ENOTDIR/)) {
      return [ basePath ];
    }

    // something is wrong, perhaps directory read permissions problem
    // maybe throw err instead
    console.error(err.stack);
    return [];
  }

  return items.filter(function (file) {

    var absPath = path.join(basePath, file);

    var stats = fs.lstatSync(absPath);
    if (stats.isSymbolicLink()) {
      return false;
    }

    var isDir = includeFiles ? true : stats.isDirectory();
    var isNotDotFile = path.basename(file).indexOf('.') !== 0;
    return isDir && isNotDotFile && (userSuppliedFilterFn || allOK)(absPath);

  }).map(function (item) {
    // return path.join(basePath, item);
    return item;
  }).sort();
}
