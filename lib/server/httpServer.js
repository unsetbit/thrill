var path = require('path'),
	http = require('http'),
	fs = require('fs'),
	utils = require('../utils.js'),
	EventEmitter = require('events').EventEmitter,
	generateId = require('node-uuid').v4,
    express = require('express');

// Executes tests on a remote server
var create = module.exports = function(callback, options){
	var options = options || {},
		host = options.host.split(":"),
		hostname = host[0] || "localhost",
		port = host[1] || 9201,
		expressInstance = options.expressInstance || express(),
		httpServer = options.httpServer || require('http').createServer(),
		baseWebPath = options.baseWebPath || '';

	httpServer.listen(port, hostname);
	httpServer.on('request', expressInstance);

	httpServer.on('error', function(e){
		thrillServer.log('Unable to start HTTP server.' + "\n")
		thrillServer.debug(e);
		thrillServer.emitter.emit('error', e);
		callback();
	});
	httpServer.on('listening', function(){
		thrillServer.log('HTTP server listening for connections on ' + (hostname!==void 0?hostname:"*")  + ":" + port + "\n");
		thrillServer.emitter.emit('listening');
		callback(thrillServer);
	});

	thrillServer = new ScriptServer(
		expressInstance, 
		hostname, 
		port, 
		baseWebPath,
		httpServer
	);

	if(options.log) thrillServer.log = options.log;
	if(options.debug) thrillServer.debug = options.debug;

	return thrillServer;
};

exports.ScriptServer = ScriptServer = function(server, hostname, port, baseWebPath, httpServer){
	this.emitter = new EventEmitter();
	this.server = server;
	this.httpServer = httpServer;
	this.hostname = hostname;
	this.port = port;
	this.baseWebPath = baseWebPath;

	var connections = this.connections = [];

	httpServer.on('connection', function(socket) {
	  connections.push(socket);
	  socket.on('close', function(){
	  	connections.splice(connections.indexOf(socket), 1);
	  });
	})

	this.resourceMap = {};
	this.urlToResourceId = {};

	this.server.all(this.baseWebPath + '/g/:groupId/*', this.getResource.bind(this));
};

ScriptServer.prototype.log = utils.noop;
ScriptServer.prototype.debug = utils.noop;

ScriptServer.prototype.kill = function(callback){
	this.httpServer.removeListener('request', this.server);
	this.connections.forEach(function(connection){
		connection.destroy();
	});
	
	this.httpServer.close(callback);
};

ScriptServer.prototype.getResource = function(request, response){
	var groupId = request.params.groupId,
		group = this.resourceMap[groupId];

	response.set({
		"Access-Control-Allow-Origin": '*',
		"Access-Control-Request-Method": "GET, POST",
		"Access-Control-Allow-Credentials": true,
		"Cache-Control": "no-cache",
		"Access-Control-Allow-Headers": request.get("Access-Control-Request-Headers")
	});

	if(request.route.method === "options"){
		response.send(200);	
		return;
	} 

	if(group === void 0){
		this.log("Couldn't find requested group: " + groupId);
		response.send(404);	
		return;
	}

	var resourcePath = request.url.replace(this.baseWebPath + '/g/' + groupId + '/', '');

	if(~resourcePath.indexOf('?')){
		resourcePath = resourcePath.substr(0, resourcePath.indexOf('?'));
	}

	var filePath = group[resourcePath];
	
	if(filePath === void 0){
		// Check to see if it's in a served directory
		utils.each(group, function(value, key){
			if(!resourcePath.indexOf(key)){
				filePath = value + "\\" + resourcePath.replace(key, "");
				return true; // breaks out of the each loop
			}
		});

		if(filePath === void 0){
			this.log("Couldn't find requested file path: " + resourcePath + "\n");
			response.send(404);
			return;
		}
	}

	fs.exists(filePath, function(exists){
		if(exists){
			response.sendfile(filePath);
		} else {
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
		groupUrl =  "http://" + self.hostname + ":" + self.port + self.baseWebPath + "/g/" + groupId + "/",
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

		resourcePath = generateId()  + "/" + baseName;

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
		runUrls = groupUrl + run;
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
