var BullhornServer = require('bullhorn').bullhornServer.BullhornServer;
	path = require('path'),
	_ = require('underscore'),
	EventEmitter = require('events').EventEmitter,
	createThrill = require('./thrill.js'),
	express = require('express');

exports.create = create = function(thrill, options){
	var options = options || {},
		port = options.port || 80,
		hostname = options.hostname || 'localhost',
		httpServer = options.httpServer || require('http').createServer().listen(port, hostname),
		baseWebPath = options.baseWebPath || "",
		webRoot =  options.webRoot || path.resolve(path.dirname(module.filename), '../../../bullhorn/client/static'),
		expressInstance = options.expressInstance || express(),
		emitter = options.emitter || new EventEmitter(),
		thrillServer;

	httpServer.on('request', expressInstance);

	thrillServer = new ThrillServer(expressInstance, hostname, port, baseWebPath, webRoot, emitter, thrill)

	return thrillServer;
};

exports.ThrillServer = ThrillServer = function(server, hostname, port, baseWebPath, webRoot, emitter, thrill){
	BullhornServer.call(this, server, hostname, port, baseWebPath, webRoot);
	
	this._emitter = emitter;
	this._thrill = thrill;
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
		if(runSettings !== void 0 && runSettings !== ""){
			runSettings = JSON.parse(runSettings);

			var manager = self._thrill.run(runSettings);
			manager.on("stopped", function(){
				var results = manager.getResults();
				response.json(results);
			});	
		}
	});
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
