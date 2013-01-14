var path = require('path'),
	utils = require('../utils.js'),
	vm = require('vm'),
	fs = require('fs');

var createThrill = require('./thrill.js'),
	createHttpServer = require('./httpServer.js'),
	reporters = require('../../').reporters;
	adapters = require('../../').adapters;

var runner = module.exports = function(config, callback){
	if(!config) throw new Error('Config must be defined');
	callback = callback || utils.noop;

	// A thrill.js file may pass in a default "base" thrill.js file to use for default values
	// This only goes one level down, if the defaults file defines a defaults file, it won't be
	// evaluated.
	if(config.config){
		config.file = config.config;
	} 

	var baseConfig = {};
	if(config.file){
		baseConfig = fileHandler(config);
		if(!baseConfig) return callback({passed: false});
	}

	var defaults = require('../../config/runner.json');

	// This fills any default properties to the config object (if they're not defined)
	setDefaults(setDefaults(config, baseConfig), defaults);

	// Collapse the config options and default options in to one variable
	var log = config.quiet? utils.noop : process.stdout.write.bind(process.stdout),
		debug = config.verbose? process.stdout.write.bind(process.stdout) : utils.noop;

	// If we don't have a run variable by this point, we can't proceed.
	if(!config.run) throw new ReferenceError("Run variable must be defined in the config object");

	var server = createHttpServer(onHttpServerReady, {
		host: config.httpHost || (getExternalIpAddress() + ":" + 9300),
		log: log,
		debug: debug,
		autoAdaptLibraries: config.autoAdapt,
		autoAdaptExtensions: config.autoAdaptExtensions
	});

	function onThrillReady(thrill, err){
		if(!thrill){
			log(err);
			return callback({passed: false});
		}

		var served,
			thrillConfig,
			test,
			reporter;

		// If auto adapt is enabled, auto inject the adapters
		if(config.autoAdapt && typeof config.run !== "string") config.run = autoAdaptFileList(config.run);

		// Handles the flag to disable streaming
		if(!config.stream) config.run = disableStream(config.run);

		// Normalize config.serve to a map
		if(typeof config.serve === "string") config.serve = { "" : config.serve };
	
		// Resolve any relative paths within the config
		resolveFiles(config);

		// Serve files and the run object through the HTTP server
		served = server.serve(config.serve, config.run);

		thrillConfig = {
			run: served.runUrls,
			filter: config.filter,
			timeout: config.timeout,
			autoStart: false
		};

		// Create the test object
		test = thrill(thrillConfig);

		var reporterParams = config.reporter.split(':');
		var reporterName = reporterParams.shift();

		if(!(reporterName in reporters)){
			log('Reporter ' + reporterName + " not found. Falling back to the dot reporter.");
			reporterName = "dot";
		}

		try{
			createReporter = require(reporters[reporterName]);
		} catch(e){
			log('Error loading reporter ' + reporterName + ". Falling back to the dot reporter.");
			createReporter = require('./reporter/dot.js');
		}

		// Create a reporter for the test
		reporter = createReporter(test, {
			log: log,
			debug: debug,
			params: reporterParams
		});

		// When the test has results, shut down our services, and execute the callback
		reporter.on('results', function(data){
			thrill.kill();
			server.kill(function(){
				callback(data);
			});
		});

		// Starts the test
		test.start();
	}

	function onHttpServerReady(server){
		createThrill(onThrillReady, {
			log: log,
			debug: debug,
			queenHost: config.host
		});
	}
};

// If we have a file it's either a config file, an html file or a test file.
// First we check to see if it's a config file by trying to parse the file
// within a JS VM. If there's a syntax error, it may be an HTML file,
// if there's a general error, it may be a test file.
function fileHandler(config){
	var baseConfig = {},
		baseDir;

	try {
		vm.runInNewContext(fs.readFileSync(config.file), baseConfig);
		config.config = path.resolve(config.file);
		baseDir = path.dirname(config.config);
		// Resolve any filepaths in the config object relative to the config file
		if(Array.isArray(baseConfig.run)){
			baseConfig.run = baseConfig.run.map(function(filePath){
				return path.resolve(baseDir, filePath);
			});
		}

		if(baseConfig.serve && typeof baseConfig.serve !== "string"){
			baseConfig.serve = utils.map(baseConfig.serve, function(filePath, key){
				return path.resolve(baseDir, filePath);
			});
		}
	}  catch(e) {
		if (e.name === 'SyntaxError') {
			// If a signle file is passed in and it has invalid JS syntax,
			// we're going to assume that this is an HTML file to test
			if(!config.run) config.run = path.resolve(config.file);
			else {
				console.error('Syntax error in file!\n' + e.message);
				return false;
			}
		} else if (e.code === 'ENOENT' || e.code === 'EISDIR') {
			console.error('Config file does not exist!');
			return false;
		} else {
			// If a single file is passed in and it has valid JS syntax,
			// it'll likely throw an error when it's evaluated by the vm
			// because it doesn't have the right context, so we'll assume
			// the user has passed us a script file to test
			if(!config.run) config.run = [path.resolve(config.file)];
			else {
				console.error('Error in parsing file: ' + e);
				return false;
			}
		}
	}

	return baseConfig;
}

// Resolves any relative file paths in the config
function resolveFiles(config){
	utils.each(config.serve, function(filePath, key, map){
		map[key] = path.resolve(filePath);
	});

	if(typeof config.run === "string"){
		config.run = path.resolve(config.run);
	} else {
		utils.each(config.serve, function(filePath, index, arr){
			arr[index] = path.resolve(filePath);
		});	
	}
}

// Returns an IP address for this machine. Modified from: http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
function getExternalIpAddress(){
	var interfaces = require('os').networkInterfaces(),
		addresses = [];

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

// Fills in obj with defaults' variables if obj doesn't already define it.
function setDefaults(obj, defaults){
	var variable;
	utils.each(defaults, function(value, key){
		if(obj[key] === void 0) obj[key] = value;
	});
	
	return obj;
}

// Goes through a list of file paths and tries to find the first instance of a library
// and injects the adapter path right after it. The regex just looks for any file with the
// library name in it, so this can be problematic if a library is renamed, or if another file
// using the library name is in the list before the library.
function autoAdaptFileList(fileList){
	var adaptableLibraryRegexMap = utils.map(adapters, function(path, name){
		return new RegExp('.*' + name + '.*\\.js', 'im');
	});

	var toInject = [], // Keeps track of where to inject the adapters in the list
		skipLibraries = {}; // Keeps track of library adapters we've already injected

	fileList.forEach(function(filePath, index){
		utils.each(adaptableLibraryRegexMap, function(regex, name){
			if(skipLibraries[name]) return; // If we already found this library skip it

			if(regex.test(filePath)){
				skipLibraries[name] = true;
				toInject.push([(index + 1), name]);
			}
		});
	});

	// Start from the reverse to keep order
	toInject.reverse().forEach(function(args){
		fileList.splice(args[0], 0, adapters[args[1]]);
	});

	return fileList;
}

function disableStream(run){
	// If it's an html-like file, add a query parameter to disable streaming
	if(typeof run === "string"){
		if(!~run.indexOf("?")) run += "?";
		else run += "&";

		run += "disableStream=true";
	} else { // If we're dealing with a list of files, add the disabler as the first item
		run.splice(0,0, path.resolve(path.dirname(module.filename), '../../lib/client/disableStream.js'));
	}

	return run;
}
