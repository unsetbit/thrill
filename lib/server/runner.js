var path = require('path'),
	utils = require('../utils.js'),
	vm = require('vm'),
	fs = require('fs');

var createThrill = require('./thrill.js'),
	createHttpServer = require('./httpServer.js'),
	createReporter = require('./reporter/unifiedDot.js'),
	adaptedLibraries = require('../../').adaptedLibraries;

module.exports = function(config, callback){
	if(!config) throw new Error('Config must be defined');
	callback = callback || utils.noop;

	var defaults = {};
	
	if(config.config) config.file = config.config;

	// If we have a file it's either a config file, an html file or a test file.
	if(config.file){
		// First we check to see if it's a config file by trying to parse the file
		// within a JS VM. If there's a syntax error, it may be an HTML file,
		// if there's a general error, it may be a test file.
		try {
			defaults = parseConfigFile(config.file);

			// Resolve any filepaths in the config object relative to the config file
			if(Array.isArray(defaults.run)){
				defaults.run = defaults.run.map(function(filePath){
					return path.resolve(path.dirname(path.resolve(config.file)), filePath);
				});
			}
			console.log(defaults.run);
			if(defaults.serve && typeof defaults.serve !== "string"){
				defaults.serve = utils.map(defaults.serve, function(filePath, key){
					return path.resolve(path.dirname(path.resolve(config.file)), filePath);
				});
			}

		}  catch(e) {
			if (e.name === 'SyntaxError') {
				// This may be a test file
				if(!config.run) config.run = config.file;
				else {
					console.error('Syntax error in file!\n' + e.message);
					callback({passed: false});
				}
			} else if (e.code === 'ENOENT' || e.code === 'EISDIR') {
				console.error('Config file does not exist!');
				callback({passed: false});
			} else {
				// This may be a test file
				if(!config.run) config.run = [config.file];
				else {
					console.error('Error in parsing file: ' + e);
					callback({passed: false});
				}
			}
		}
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
		autoAdapt = true,
		autoAdaptExtensions = config.autoAdaptExtensions || defaults.autoAdaptExtensions,
		log = quiet? utils.noop : process.stdout.write.bind(process.stdout),
		debug = verbose? process.stdout.write.bind(process.stdout) : utils.noop;
	
	if(defaults.autoAdapt !== void 0) autoAdapt = defaults.autoAdapt;
	if(config.autoAdapt !== void 0) autoAdapt = config.autoAdapt;

	if(!run) throw new ReferenceError("Run variable must be defined in the config object");

	if(library && typeof run !== "string" && library in adaptedLibraries){
		run.unshift(adaptedLibraries[library]);
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
		autoAdaptLibraries: autoAdapt,
		autoAdaptExtensions: autoAdaptExtensions
	});
};

function parseConfigFile(filePath){
	var config = {};
	vm.runInNewContext(fs.readFileSync(filePath), config);
	return config;
}

function getExternalIpAddress(){
	var interfaces = require('os').networkInterfaces();
	var addresses = [];
	utils.each(interfaces, function(interf, name){
		addresses = addresses.concat(
			utils.filter(interf, function(node){
				return node.family === "IPv4" && node.internal === false;
			})
		);
	});

	if(addresses.length > 0){
		return addresses[0].address;
	}
}