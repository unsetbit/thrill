var tty = require('tty'),
	diff = require('diff'),
  	ms = require('./ms');

/**
 * Save timer references to avoid Sinon interfering (see GH-237).
 */

var Date = global.Date,
	setTimeout = global.setTimeout,
	setInterval = global.setInterval,
	clearTimeout = global.clearTimeout,
	clearInterval = global.clearInterval;

/**
 * Check if both stdio streams are associated with a tty.
 */
var isatty = tty.isatty(1) && tty.isatty(2);

var utils = module.exports;

/**
 * Enable coloring by default.
 */

utils.useColors = isatty;

/**
 * Default color map.
 */

utils.colors = {
    'pass': 90,
    'fail': 31,
    'bright pass': 92,
    'bright fail': 91,
    'bright yellow': 93,
    'pending': 36,
    'suite': 0,
    'error title': 0,
    'error message': 31,
    'error stack': 90,
    'checkmark': 32,
    'fast': 90,
    'medium': 33,
    'slow': 31,
    'green': 32,
    'light': 90,
    'diff gutter': 90,
    'diff added': 42,
    'diff removed': 41
};

utils.ANSI_COLOR_CODE = {
	'black': '[30m',
	'red': '[31m',
	'green': '[32m',
	'yellow': '[33m',
	'blue': '[34m',
	'purple': '[35m',
	'cyan': '[36m',
	'white': '[37m',
	'default': '[39m',
	'bright black': '[90m',
	'bright red': '[91m',
	'bright green': '[92m',
	'bright yellow': '[93m',
	'bright blue': '[94m',
	'bright purple': '[95m',
	'bright cyan': '[96m',
	'bright white': '[97m',
	'bright default': '[99m'
}

// With node.js on Windows: use symbols available in terminal default fonts
if ('win32' !== process.platform) {
	utils.symbols = {
		ok: '✓',
	  	err: '✖',
	  	dot: '․'
	};	
} else {
	utils.symbols = {
		ok: '\u221A',
	  	err: '\u00D7',
	  	dot: '\u2022'
	};	
}

/**
 * Color `str` with the given `type`,
 * allowing colors to be disabled,
 * as well as user-defined color
 * schemes.
 *
 * @param {String} type
 * @param {String} str
 * @return {String}
 * @api private
 */

var color = utils.color = function(name, str) {
	if (!exports.useColors) return str;
	return '\u001b' +  utils.ANSI_COLOR_CODE[name] + str + '\u001b[0m';
};

/**
 * Expose term window size, with some
 * defaults for when stderr is not a tty.
 */

utils.window = {
	width: isatty ? process.stdout.getWindowSize
	  				? process.stdout.getWindowSize(1)[0]
	  				: tty.getWindowSize()[1]
				  : 75
};

/**
 * Expose some basic cursor interactions
 * that are common among reporters.
 */

utils.cursor = {
	hide: function(){
		process.stdout.write('\u001b[?25l');
	},

	show: function(){
		process.stdout.write('\u001b[?25h');
	},

	back: function(){
		process.stdout.write('\u001b[1D');
	},

	deleteLine: function(){
		process.stdout.write('\u001b[2K');
	},

	beginningOfLine: function(){
		process.stdout.write('\u001b[0G');
	},

	CR: function(){
		exports.cursor.deleteLine();
		exports.cursor.beginningOfLine();
	}
};

/**
 * Pad the given `str` to `len`.
 *
 * @param {String} str
 * @param {String} len
 * @return {String}
 * @api private
 */

utils.pad = function(str, len) {
  str = String(str);
  return Array(len - str.length + 1).join(' ') + str;
};

/**
 * Return a character diff for `err`.
 *
 * @param {Error} err
 * @return {String}
 * @api private
 */

utils.errorDiff = function(err, type, escape) {
  return diff['diff' + type](err.actual, err.expected).map(function(str){
    if (escape) {
      str.value = str.value
        .replace(/\t/g, '<tab>')
        .replace(/\r/g, '<CR>')
        .replace(/\n/g, '<LF>\n');
    }
    if (str.added) return colorLines('diff added', str.value);
    if (str.removed) return colorLines('diff removed', str.value);
    return str.value;
  }).join('');
};

/**
 * Color lines for `str`, using the color `name`.
 *
 * @param {String} name
 * @param {String} str
 * @return {String}
 * @api private
 */

utils.colorLines = function(name, str) {
  return str.split('\n').map(function(str){
    return color(name, str);
  }).join('\n');
};