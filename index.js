var path = require('path'),
	utils = require('./lib/utils.js'),
	dirname = path.dirname(module.filename);

var configDir = exports.configDir = path.resolve(dirname, './config');

var adapters = exports.adapters = {};
var adapterConfig = exports.adapterConfig = require(configDir + '/adapters.json');
utils.each(adapterConfig, function(filePath, libName){
	if(filePath[0] === ".") filePath = path.resolve(configDir, filePath);
	adapters[libName] = filePath;
});

var reporters = exports.reporters = {};
var reporterConfig = exports.adapterConfig = require(configDir + '/reporters.json');
utils.each(reporterConfig, function(filePath, name){
	if(filePath[0] === ".") filePath = path.resolve(configDir, filePath);
	reporters[name] = filePath;
});

exports.thrill = require('./lib/server/thrill.js');
exports.runner = require('./lib/server/runner.js');
