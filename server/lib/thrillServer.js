var BullhornServer = require('../../../bullhorn').bullhornServer.BullhornServer;
	path = require('path'),
	_ = require('underscore'),
	EventEmitter = require('events').EventEmitter,
	express = require('express');

exports.create = create = function(options){
	var options = options || {},
		port = options.port || 80,
		httpServer = options.httpServer || require('http').createServer().listen(port),
		baseWebPath = options.baseWebPath || "",
		emitter = options.emitter || new EventEmitter(),
		webRoot =  options.webRoot || path.resolve(path.dirname(module.filename), '../../../bullhorn/client/static'),
		expressInstance = express(),
		thrillServer;

	httpServer.on('request', expressInstance);

	thrillServer = new ThrillServer(expressInstance, webRoot, baseWebPath, emitter)

	return thrillServer;
};

exports.ThrillServer = ThrillServer = function(server, webRoot, baseWebPath, emitter){
	BullhornServer.apply(this, arguments);
	this._emitter = emitter;
	_.bindAll(this, "_postTest");
	this._server.post(baseWebPath + '/test', this._postTest);
};

ThrillServer.prototype = Object.create(BullhornServer.prototype);

ThrillServer.prototype._postTest = function(request, response){
	var self = this, 
		runSettings = "";

	request.setEncoding('utf8');

	request.on("data", function(chunk){
		runSettings += chunk;
	});
	
	request.on("end", function(){
		console.log(runSettings);
		runSettings = JSON.parse(runSettings);
		self._emit('run', runSettings);	
	})
	
};

ThrillServer.prototype.on = function(event, callback){
	this._emitter.on(event, callback);
};

ThrillServer.prototype.once = function(event, callback){
	this._emitter.once(event, callback);
};

ThrillServer.prototype.removeListener = function(event, callback){
	this._emitter.removeListener(event, callback);
};

ThrillServer.prototype._emit = function(event, data){
	this._emitter.emit(event, data);
};
