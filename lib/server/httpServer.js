var path = require('path'),
	http = require('http'),
	EventEmitter = require('events').EventEmitter,
	generateId = require('node-uuid').v4,
    express = require('express');

// Executes tests on a remote server
var create = module.exports = function(callback, options){
	var options = options || {},
		port = options.port || 9201,
		host = options.host || "localhost",
		expressInstance = options.expressInstance || express(),
		httpServer = options.httpServer || require('http').createServer(),
		baseWebPath = options.baseWebPath || '';

	httpServer.listen(port, host);
	httpServer.on('request', expressInstance);

	httpServer.on('error', function(e){
		thrillServer.log('Unable to start HTTP server.')
		thrillServer.log(e);
		thrillServer.emitter.emit('error', e);
		callback();
	});
	httpServer.on('listening', function(){
		thrillServer.log('HTTP server listening for connections on ' + (host!==void 0?host:"*")  + ":" + port);
		thrillServer.emitter.emit('listening');
		callback(thrillServer);
	});

	thrillServer = new ScriptServer(
		expressInstance, 
		host, 
		port, 
		baseWebPath,
		httpServer
	);

	if(options.log) thrillServer.log = options.log;

	return thrillServer;
};

exports.ScriptServer = ScriptServer = function(server, host, port, baseWebPath, httpServer){
	this.emitter = new EventEmitter();
	this.server = server;
	this.httpServer = httpServer;
	this.host = host;
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

	this.server.get(this.baseWebPath + '/tmp/:resourceId/:baseName', this.getTmpResource.bind(this));
};

ScriptServer.prototype.log = function(){};

ScriptServer.prototype.kill = function(callback){
	this.httpServer.removeListener('request', this.server);
	this.connections.forEach(function(connection){
		connection.destroy();
	});
	
	this.httpServer.close(callback);
};

ScriptServer.prototype.getTmpResource = function(request, response){
	var resourceId = request.params.resourceId,
		filePath = this.resourceMap[resourceId];
		
	if(filePath === void 0){
		response.send(404);
		return;
	}

	response.sendfile(filePath);
};

ScriptServer.prototype.serveFiles = function(originalPaths){
	var self = this,
		urls = [],
		resourceMap = this.resourceMap,
		urlToResourceId = this.urlToResourceId,
		dupeCount = 0;
	
	originalPaths.forEach(function(filePath){
		var baseName, 
			url,
			resourceId = generateId();

		if(filePath.indexOf('http') === 0){
			urls.push(filePath);
			return;
		}
		
		file = path.resolve(filePath);
		baseName = path.basename(file);

		url = "http://" + self.host + ":" + self.port + self.baseWebPath + "/tmp/" + resourceId + "/" + baseName;
		urls.push(url);
		
		resourceMap[resourceId] = file;
		urlToResourceId[url] = resourceId;
	});

	return urls;
};

ScriptServer.prototype.stopServingFiles = function(urls){
	var self = this,
		resourceMap = this.resourceMap,
		urlToResourceId = this.urlToResourceId;

	urls.forEach(function(url){
		var resourceId = urlToResourceId[url];

		if(resourceId === void 0 || self.resourceMap[resourceId] === void 0) return;

		delete self.resourceMap[resourceId];
	});
};
