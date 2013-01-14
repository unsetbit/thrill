var path = require('path'),
	utils = require('./lib/utils.js'),
	dirname = path.dirname(module.filename);

var configDir = exports.configDir = path.resolve(dirname, './config');
var adapterConfig = exports.adapterConfig = require(configDir + '/adapters.json');

var adapters = exports.adapters = {};

utils.each(adapterConfig, function(filePath, libName){
	if(filePath[0] === ".") filePath = path.resolve(configDir, filePath);
	adapters[libName] = filePath;
});

exports.thrill = require('./lib/server/thrill.js');
exports.runner = require('./lib/server/runner.js');
