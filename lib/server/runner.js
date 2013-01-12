var path = require('path'),
	utils = require('../utils.js'),
	vm = require('vm'),
	fs = require('fs');

var createThrill = require('./thrill.js'),
	createHttpServer = require('./httpServer.js'),
	createReporter = require('./reporter/unifiedDot.js');

module.exports = function(config, callback){
	if(!config) throw new Error('Config must be defined');
	callback = callback || utils.noop;

	var defaults = {};
	if(config.file){
		defaults = parseConfigFile(config.file);
	}
	
	var quiet = (config.quiet !== void 0)? config.quiet : defaults.quiet,
		verbose = (config.verbose !== void 0)? config.verbose : defaults.verbose,
		queenHost = config.host || defaults.host,
		httpHost = config.httpHost || defaults.httpHost,
		timeout = config.timeout || defaults.timeout || 2 * 60 * 1000,
		filter = config.filter || defaults.filter,
		run = config.run || defaults.run,
		library = config.library || defaults.library,
		pathMap = config.serve || defaults.serve,
		log = quiet? utils.noop : process.stdout.write.bind(process.stdout),
		debug = verbose? process.stdout.write.bind(process.stdout) : utils.noop;
	
	if(!run) throw new ArgumentError("Run variable must be defined in the config object");

	if(library){
		run.unshift('../../dist/thrill-qunit.js');
	}

	function onThrillReady(thrill, err){
		if(!thrill){
			log(err);
			callback({passed: false});
			return;
		}
		
		var served = server.serve(pathMap, run);
		var thrillConfig = {
			run: served.runUrls,
			filter: filter,
			timeout: timeout,
			autoStart: false
		};

		var test = thrill(thrillConfig);

		var reporter = createReporter(test, {
			log: log,
			debug: debug
		});

		reporter.on('results', function(data){
			server.kill();
			thrill.kill();
			callback(data);
		});

		test.start();
	}

	function onServerReady(server){
		createThrill(onThrillReady, {
			log: log,
			debug: debug,
			queenHost: queenHost
		});
	}

	var server = createHttpServer(onServerReady, {
		host: httpHost || (getExternalIpAddress() + ":" + 9300),
		log: log,
		debug: debug,
	});
};

function parseConfigFile(filePath){
	var config = {};
	
	try {
		vm.runInNewContext(fs.readFileSync(filePath), config);
	} catch(e) {
		if (e.name === 'SyntaxError') {
		  console.error('Syntax error in config file!\n' + e.message);
		} else if (e.code === 'ENOENT' || e.code === 'EISDIR') {
		  console.error('Config file does not exist!');
		} else {
		  console.error('Invalid config file!\n', e);
		}

		process.exit(1);
	}

	return config;
}

function getExternalIpAddress(){
	var interfaces = require('os').networkInterfaces();
	var addresses = [];
	utils.each(interfaces, function(interface, name){
		addresses = addresses.concat(
			utils.filter(interface, function(node){ 
				return node.family === "IPv4" && node.internal === false;
			})
		);
	});

	if(addresses.length > 0){
		return addresses[0].address;
	}
}