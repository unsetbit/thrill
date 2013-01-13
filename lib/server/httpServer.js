var path = require('path'),
	http = require('http'),
	fs = require('fs'),
	utils = require('../utils.js'),
	EventEmitter = require('events').EventEmitter,
	generateId = require('node-uuid').v4,
	adapterScripts = require('../../').adapterScripts;
    express = require('express');

// Generate a list of regular expressions to find library scripts with in order to inject adapters
// if the libraryInterceptor option is enabled (and it is by default).
var ADAPTABLE_LIBRARIES = Object.keys(adapterScripts),
	ADAPTABLE_LIBRARY_REGEX = {},
	ADAPTER_REGEX = {};

ADAPTABLE_LIBRARIES.forEach(function(name){
	var regex = new RegExp('<script.*src=[\'"]?.*' + name + '.*\.js[\'"].*?>.*</.*script.*>', 'im');
	ADAPTABLE_LIBRARY_REGEX[name] = regex;
	
	regex = new RegExp('<script.*src=[\'"]?.*thrill-' + name + '-adapter.*\.js[\'"].*?>.*</.*script.*>', 'im');
	ADAPTER_REGEX[name] = regex;
});

// Executes tests on a remote server
var create = module.exports = function(callback, options){
	var options = options || {},
		host = options.host,
		hostArr = host.split(":"),
		hostname = hostArr[0] || "localhost",
		port = hostArr[1] || 9201,
		expressInstance = options.expressInstance || express(),
		httpServer = options.httpServer || require('http').createServer();

	httpServer.listen(port, hostname);
	httpServer.on('request', expressInstance);

	httpServer.on('error', function(e){
		thrillServer.log('Unable to start HTTP server.' + "\n")
		thrillServer.debug(e);
		thrillServer.emitter.emit('error', e);
		callback();
	});
	httpServer.on('listening', function(){
		thrillServer.log('HTTP server listening for connections on ' + host + "\n");
		thrillServer.emitter.emit('listening');
		callback(thrillServer);
	});

	thrillServer = new ScriptServer(
		expressInstance, 
		host, 
		httpServer
	);

	if(options.log) thrillServer.log = options.log;
	if(options.debug) thrillServer.debug = options.debug;
	if(options.autoAdaptLibraries !== void 0) thrillServer.autoAdaptLibraries = options.autoAdaptLibraries;
	if(options.autoAdaptExtensions) thrillServer.autoAdaptExtensions = options.autoAdaptExtensions;
	
	return thrillServer;
};

exports.ScriptServer = ScriptServer = function(server, host, httpServer){
	this.emitter = new EventEmitter();
	this.server = server;
	this.httpServer = httpServer;
	this.host = host;


	var connections = this.connections = [];

	httpServer.on('connection', function(socket) {
	  connections.push(socket);
	  socket.on('close', function(){
	  	connections.splice(connections.indexOf(socket), 1);
	  });
	})

	this.resourceMap = {};
	this.urlToResourceId = {};

	this.server.all('/g/:groupId/*', this.getResource.bind(this));
};

ScriptServer.prototype.log = utils.noop;
ScriptServer.prototype.debug = utils.noop;
ScriptServer.prototype.autoAdaptLibraries = true;
ScriptServer.prototype.autoAdaptExtensions = ['.html', '.htm'];

ScriptServer.prototype.kill = function(callback){
	callback = callback || utils.noop;

	this.connections.forEach(function(connection){
		connection.destroy();
	});
	
	delete this.server;

	callback();
};


ScriptServer.prototype.getResource = function(request, response){
	var self = this,
		groupId = request.params.groupId,
		group = this.resourceMap[groupId];

	// HEAD requests must not return a body, OPTIONS is not handled by this server
	if(request.route.method === "options" || request.route.method === "head"){
		response.send(200);	
		return;
	} 

	if(group === void 0){
		this.log("Couldn't find requested group: " + groupId);
		response.send(404);	
		return;
	}

	// Remove the junk for group routing
	var resourcePath = request.path.replace('/g/' + groupId + '/', '');
	
	// Decode the uri as it may contain encoded characters
	resourcePath = decodeURI(resourcePath);

	var filePath = group[resourcePath];
	

	if(filePath === void 0){
		// Check to see if the file is contained in one of the directories
		// served for this group
		utils.each(group, function(value, key){
			if(!resourcePath.indexOf(key)){
				filePath = value + "\\" + resourcePath.replace(key, "");
				return true; // breaks out of the each loop
			}
		});

		// We did our best and still can't find the file.
		if(filePath === void 0){
			this.log("Couldn't find requested file path: " + resourcePath + "\n");
			response.send(404);
			return;
		}
	}

	// You're probably thinking, "why don't you just check to see if the files exist
	// when you are adding them to the group?" Well, we can't do that easily because
	// we support the serving of paths, so if we get a request of a file inside those
	// directories, we can't determin if it exists or not until this point.
	// But yes, it is possible to cache the results of this in a map somewhere... [todo] ozan
	fs.exists(filePath, function(exists){
		var extname;
		if(exists){
			if(!self.autoAdaptLibraries){
				response.sendfile(filePath);	
				return;
			}

			// We're going to see if this is an html-like file
			// If it is, we're going to see if it has a testing library
			// that we're familiar with. If it does, and it doesn't have
			// a thrill adapter, we're going to add it in there.
			// This is a relatively heavy operation, but it makes thrill super easy to use
			// and can be disabled with a switch (autoAdaptLibraries).
			extname = path.extname(filePath);
			if(~self.autoAdaptExtensions.indexOf(extname)){
				fs.readFile(filePath, function(err, data){
					if(err) return response.send(500);
					var waitingOn = 0; // Keeps track of how many async ops we're waiting on.
					
					data = data.toString();
					
					// Supports adapting many libraries in one file.
					ADAPTABLE_LIBRARIES.forEach(function(name){
						var regex = ADAPTABLE_LIBRARY_REGEX[name],
							match = data.match(regex);

						if(!match) return;
						
						// If an adapter already exists on this page,
						// don't add another.
						var adapterRegex = ADAPTER_REGEX[name];	
						if(data.match(adapterRegex)) return;

						waitingOn++;
						fs.readFile(adapterScripts[name], function(err, adapterScript){
							waitingOn--;
					
							if(err){
								self.log("Error in reading adapter script: " + err);
							} else {
								var injectPosition = match.index + match[0].length;
								data = data.substr(0, injectPosition) + "<script>" + adapterScript + "</script>" + data.substr(injectPosition);
							}

							// Once all adapter scripts had a chance to be injected
							// send the response
							if(waitingOn === 0){
								response.send(data);
							}
						});
					});

					// If there were no matched, waiting on will be 0
					// in which case we can serve the original file
					if(waitingOn === 0){
						response.send(data);
					}
				});
			} else {
				response.sendfile(filePath);	
			}
		} else {
			// The file doesn't exist
			response.send(404);
		}
	});
};

ScriptServer.prototype.serve = function(pathMap, run){
	var self = this,
		runUrls,
		resourceMap = this.resourceMap,
		urlToResourceId = this.urlToResourceId,
		dupeCount = 0,
		runIsString = typeof run === "string",
		runFileServedByPathMap = false, // If the path map includes the run file's directory
		groupId = generateId(),
		groupUrl =  "http://" + self.host + "/g/" + groupId + "/",
		groupResources = resourceMap[groupId] = {};
	
	function serveFile(filePath, noUid){
		var baseName, 
			url,
			resourcePath;

		if(filePath.indexOf('http') === 0){ // Skip if this is already a valid HTTP path
			return filePath;
		}
		
		filePath = path.resolve(filePath);
		baseName = path.basename(filePath);

		resourcePath = baseName;

		groupResources[resourcePath] = filePath;
		
		self.debug('Serving ' + filePath + " as " + resourcePath + "\n");

		return groupUrl + resourcePath;
	}

	utils.each(pathMap, function(value, key){
		var relativePath,
			filePath = path.resolve(value);

		self.debug('Serving ' + filePath + " as " + key + "\n");
		
		groupResources[key] = filePath;
	});
	
	if(runIsString){ 
		var runFileIsServed = false;

		// Check to see if it's in a served directory
		utils.each(groupResources, function(value, key){
			if(!resourcePath.indexOf(key)){
				filePath = value + "\\" + resourcePath.replace(key, "");
				runFileIsServed = true;
				return true; // breaks out of the each loop
			}
		});

		if(runFileIsServed){
			runUrls = groupUrl + run;	
		} else {
			runUrls = serveFile(run);
			groupResources[''] = path.dirname(path.resolve(run));
		}
		
	} else {// if it's a list of files
		runUrls = run.map(serveFile);
	}

	return {
		groupId: groupId,
		runUrls: runUrls
	}
};

ScriptServer.prototype.stopServing = function(groupId){
	if(groupId in this.resourceMap){
		delete this.resourceMap[groupId];
	}
};
