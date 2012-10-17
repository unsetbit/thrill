var BullhornServer = require('bullhorn').bullhornServer.BullhornServer;
	path = require('path'),
	_ = require('underscore'),
	express = require('express');

exports.create = create = function(thrill, options){
	var options = options || {},
		port = options.port || 80,
		hostname = options.hostname || 'localhost',
		httpServer = options.httpServer || require('http').createServer().listen(port, hostname),
		baseWebPath = options.baseWebPath || "",
		webRoot =  options.webRoot || path.resolve(path.dirname(module.filename), '../../../bullhorn/client/static'),
		expressInstance = options.expressInstance || express(),
		thrillServer;

	httpServer.on('request', expressInstance);

	thrillServer = new ThrillServer(expressInstance, hostname, port, baseWebPath, webRoot, thrill)

	return thrillServer;
};

exports.ThrillServer = ThrillServer = function(server, hostname, port, baseWebPath, webRoot, thrill){
	BullhornServer.call(this, server, hostname, port, baseWebPath, webRoot);
	
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
