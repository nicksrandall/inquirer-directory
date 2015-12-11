# inquirer-directory

Relative Directory prompt for [inquirer](https://github.com/SBoudrias/Inquirer.js)

[![Build Status](https://travis-ci.org/nicksrandall/inquierer-directory.svg)](https://travis-ci.org/nicksrandall/inquierer-directory)

## Installation

```
npm install --save inquirer-directory
```

## Usage


This prompt is anonymous, meaning you can register this prompt with the type name you please:

```javascript
inquirer.registerPrompt('directory', require('inquirer-directory'));
inquirer.prompt({
  type: 'directory',
  ...
})
```

Change `directory` to whatever you might prefer.

### Options

Takes `type`, `name`, `message`, `basePath` properties.

See [inquirer](https://github.com/SBoudrias/Inquirer.js) readme for meaning of all except **basePath**.

**basePath** is the relative path from your current working directory

#### Example

```javascript
inquirer.registerPrompt('directory', require('inquirer-directory'));
inquirer.prompt([{
  type: 'directory',
  name: 'from',
  message: 'Where you like to put this component?',
  basePath: './src'
}], function(answers) {
  //etc
});
```

[![asciicast](https://asciinema.org/a/31651.png)](https://asciinema.org/a/31651)

See also [example.js](https://github.com/nicksrandall/inquierer-directory/blob/master/example.js) for a working example

## License

MIT
