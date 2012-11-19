var path = require('path'),
	_ = require('underscore'),
	http = require('http'),
	EventEmitter = require('events').EventEmitter;
	uuid = require('node-uuid'),
    express = require('express');

// Executes tests on a remote server
exports.create = create = function(options){
	var options = options || {},
		port = options.port || 80,
		hostname = options.hostname || 'localhost',
		baseWebPath = options.baseWebPath || '',
		webRoot = options.webRoot || require('../../../minion-master').staticDir,
		httpServer = options.httpServer || require('http').createServer().listen(port, hostname),
		expressInstance = options.expressInstance || express(),
		thrillServer;

	httpServer.on('request', expressInstance);
	thrillServer = new ThrillServer(expressInstance, hostname, port, baseWebPath, webRoot);

	return thrillServer;
};

exports.ThrillServer = ThrillServer = function(server, hostname, port, baseWebPath, webRoot){
	this._emitter = new EventEmitter();
	this._server = server;
	this._hostname = hostname;
	this._port = port;
	this._baseWebPath = baseWebPath;

	this._resourceMap = {};
	this._urlToResourceId = {};

	_.bindAll(this, "_getTmpResource", 
					"_postTest");
	

	this._server.use(baseWebPath, express.static(webRoot));
	this._server.get(this._baseWebPath + '/tmp/:resourceId/:baseName', this._getTmpResource);
	this._server.post(baseWebPath + '/test', this._postTest);
};

ThrillServer.prototype.getServer = function(){
	return this._server;
};

ThrillServer.prototype._getTmpResource = function(request, response){
	var resourceId = request.params.resourceId,
		filePath = this._resourceMap[resourceId];
		
	if(filePath === void 0){
		return;
	}

	response.sendfile(filePath);
};

ThrillServer.prototype.serveFiles = function(originalPaths){
	var self = this,
		urls = [],
		resourceMap = this._resourceMap,
		urlToResourceId = this._urlToResourceId,
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

		url = "http://" + self._hostname + ":" + self._port + self._baseWebPath + "/tmp/" + resourceId + "/" + baseName;
		urls.push(url);
		
		resourceMap[resourceId] = file;
		urlToResourceId[url] = resourceId;
	});

	return urls;
};

ThrillServer.prototype.stopServingFiles = function(urls){
	var self = this,
		resourceMap = this._resourceMap,
		urlToResourceId = this._urlToResourceId;

	urls.forEach(function(url){
		var resourceId = urlToResourceId[url];

		if(resourceId === void 0 || self._resourceMap[resourceId] === void 0) return;

		delete self._resourceMap[resourceId];
	});
};

ThrillServer.prototype._postTest = function(request, response){
	var self = this, 
		runSettings = "";

	request.setEncoding('utf8');

	request.on("data", function(chunk){
		runSettings += chunk;
	});
	
	request.on("end", function(){
		if(runSettings !== void 0 && runSettings !== ""){
			runSettings = JSON.parse(runSettings);
			self._emit('runRequest', runSettings, function(data){
				response.json(data);
			});	
		}
	});
};

// Event Handlers
ThrillServer.prototype.on = function(event, callback){
	this._emitter.on(event, callback);
};

ThrillServer.prototype.removeListener = function(event, callback){
	this._emitter.removeListener(event, callback);
};

ThrillServer.prototype._emit = function(){
	this._emitter.emit.apply(this._emitter, arguments);
};