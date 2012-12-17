var path = require('path'),
	http = require('http'),
	EventEmitter = require('events').EventEmitter;
	uuid = require('node-uuid'),
	queen = require('../../../queen');
    express = require('express');

// Executes tests on a remote server
var create = module.exports = function(options){
	var options = options || {},
		port = options.port || 9201,
		host = options.host || "localhost",
		expressInstance = options.expressInstance || express(),
		httpServer = options.httpServer || require('http').createServer().listen(port, host),
		baseWebPath = options.baseWebPath || '';

	httpServer.on('request', expressInstance);
	
	thrillServer = new ScriptServer(
		expressInstance, 
		host, 
		port, 
		baseWebPath
	);

	return thrillServer;
};

exports.ScriptServer = ScriptServer = function(server, host, port, baseWebPath){
	this.emitter = new EventEmitter();
	this.server = server;
	this.host = host;
	this.port = port;
	this.baseWebPath = baseWebPath;

	this.resourceMap = {};
	this.urlToResourceId = {};

	this.server.get(this.baseWebPath + '/tmp/:resourceId/:baseName', this.getTmpResource.bind(this));
};

ScriptServer.prototype.getTmpResource = function(request, response){
	var resourceId = request.params.resourceId,
		filePath = this.resourceMap[resourceId];
		
	if(filePath === void 0){
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
			resourceId = uuid.v4();

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
