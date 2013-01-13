// Some of these utils functions are taken or modified from the mocha library by TJ Holowaychuk
// http://visionmedia.github.com/mocha/ & https://github.com/visionmedia/mocha/blob/master/LICENSE

var tty = require('tty');

var utils =  module.exports;

/**
 * Check if both stdio streams are associated with a tty.
 */
var isatty = utils.isatty = tty.isatty(1) && tty.isatty(2);

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
};

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
 * Expose term window size, with some
 * defaults for when stderr is not a tty.
 */
 utils.window = {};
if(isatty){
	if(process.stdout.getWindowSize){
		utils.window.width = process.stdout.getWindowSize(1)[0];
	} else {
		utils.window.width = tty.getWindowSize()[1];
	}
} else {
	utils.window.width = 75;
}

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
 * Color `str` with the given `type`,
 * allowing colors to be disabled,
 * as well as user-defined color
 * schemes.
 */
var color = utils.color = function(name, str) {
	if (!isatty) return str;
	return '\u001b' +  utils.ANSI_COLOR_CODE[name] + str + '\u001b[0m';
};

/**
 * Color lines for `str`, using the color `name`.
 */
utils.colorLines = function(name, str) {
	return str.split('\n').map(function(str){
		return color(name, str);
	}).join('\n');
};

// Pad the given `str` to `len`.
utils.pad = function(str, len) {
	str = String(str);
	return Array(len - str.length + 1).join(' ') + str;
};