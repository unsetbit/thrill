var BullhornServer = require('../../../bullhorn').bullhornServer.BullhornServer;
	path = require('path'),
	express = require('express');

exports.create = create = function(options){
	var options = options || {},
		port = options.port || 80,
		httpServer = options.httpServer || require('http').createServer().listen(port),
		baseWebPath = options.baseWebPath || "",
		webRoot =  options.webRoot || path.resolve(path.dirname(module.filename), '../../../bullhorn/client/static'),
		expressInstance = express(),
		bullhornServer;

	httpServer.on('request', expressInstance);

	bullhornServer = new BullhornServer(expressInstance, webRoot, baseWebPath)

	return bullhornServer;
};

exports.ThrillServer = ThrillServer = function(server, baseWebPath, webRoot){
	BullhornServer.apply(this, arguments);
};

ThrillServer.prototype = Object.create(BullhornServer.prototype);