#!/usr/bin/env node

var path = require('path'),
	utils = require('../utils.js'),
	fs = require('fs');

var getExternalIpAddress = function(){
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
};

module.exports = function(config, callback){
	var createThrill = require('./thrill.js'),
		createHttpServer = require('./httpServer.js'),
		createReporter = require('./reporter/unifiedDot.js'),
		run = config.run,
		runHtml,
		verbose = config.verbose === true,
		quiet = config.quiet === true,
		log = console.log.bind(console),
		debug = utils.noop,
		pathMap = config.serve || {};

	if(verbose){
		debug = log;
	}	

	if(quiet){
		log = utils.noop;
	}

	if(!run) throw Error('Run variable must be defined.');

	function onServerReady(server){
		var served = server.serve(pathMap, run);
		
		if(runHtml){
			runHtml = runHtml.replace(/(<head.*>)/,'$1' + '<base href="' + served.runUrls + '"></base>');
		}

		function onReady(thrill){
			var thrillConfig = {
				run: runHtml || served.runUrls,
				filter: config.filter,
				timeout: config.timeout,
				autoStart:false
			};

			var test = thrill(thrillConfig);

			var reporter = createReporter(test);
			reporter.on('results', function(data){
				server.kill();
				thrill.kill();
				callback && callback(data);
			});

			test.start();
		};

		createThrill(onReady, {
			log: log,
			debug: debug,
			queenPort: config.port,
			queenHost: config.host
		});
	}

	function createServer(){
		var server = createHttpServer(onServerReady, {
			port: config.httpPort || 9300,
			host: config.httpHost || getExternalIpAddress(),
			log: log,
			debug: debug,
		});	
	}

	if(typeof run === "string" && !~run.indexOf('.js')){
		fs.readFile(run, function(err, data){
			if(err) throw err;
			runHtml = data.toString();
			createServer();
		});
	} else {
		createServer();
	}
};
