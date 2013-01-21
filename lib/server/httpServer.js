var path = require('path'),
	http = require('http'),
	its = require('its'),
	fs = require('fs'),
    express = require('express'),
	EventEmitter = require('events').EventEmitter,
	generateId = require('node-uuid').v4,
	utils = require('../utils.js'),
	adapters = require('../../').adapters;

function getExternalIpAddress(){
	var interfaces = require('os').networkInterfaces();
	var addresses = [];
	utils.each(interfaces, function(iface, name){
		addresses = addresses.concat(
			utils.filter(iface, function(node){ 
				return node.family === "IPv4" && node.internal === false;
			})
		);
	});

	if(addresses.length > 0){
		return addresses[0].address;
	}
}

var create = module.exports = function(options){
	options = options || {};

	var callback = options.callback || utils.noop,
		host = options.host || "",
		hostArr = host.split(":"),
		hostname = hostArr[0],
		port = hostArr[1] || 9300,
		expressInstance = options.expressInstance || express(),
		httpServer = options.httpServer || require('http').createServer(),
		server;

	httpServer.listen(port, hostname);
	httpServer.on('request', expressInstance);

	// If no hostname was found, we still need a path to refer to ourself
	if(!hostname) host = getExternalIpAddress() + ":" + port;
	else host = hostname + ":" + port;

	httpServer.on('error', function(e){
		server.log('[HTTP Server] Unable to start: ' + e + "\n");
		server.emitter.emit('error', e);
		callback(e);
	});

	httpServer.on('listening', function(){
		server.debug('[HTTP Server] Listening for connections on ' + host + "\n");
		server.emitter.emit('listening');
		callback(server);
	});

	server = new HttpServer(
		httpServer,
		expressInstance, 
		host
	);

	if(options.log) server.log = options.log;
	if(options.debug) server.debug = options.debug;
	if(options.autoAdapt !== void 0) server.autoAdapt = options.autoAdapt;
	if(options.autoAdaptExtensions) server.autoAdaptExtensions = options.autoAdaptExtensions;
	
	return server;
};

var HttpServer = exports.HttpServer = function(httpServer, expressInstance, host){
	its.object(httpServer, 'An http server must be defined');
	its.object(expressInstance, 'An express instance must be defined');
	its.string(host, 'A host string must be defined');
	
	this.emitter = new EventEmitter();
	this.expressInstance = expressInstance;
	this.httpServer = httpServer;
	this.host = host;


	var connections = this.connections = [];

	httpServer.on('connection', function(socket) {
		connections.push(socket);
		socket.on('close', function(){
			connections.splice(connections.indexOf(socket), 1);
		});
	});

	this.resourceMap = {};
	this.urlToResourceId = {};

	this.expressInstance.all('/g/:groupId/*', this.getResource.bind(this));
};

HttpServer.prototype.log = utils.noop;
HttpServer.prototype.debug = utils.noop;
HttpServer.prototype.autoAdapt = true;
HttpServer.prototype.autoAdaptExtensions = ['.html', '.htm'];

HttpServer.prototype.kill = function(callback){
	this.connections.forEach(function(connection){
		connection.destroy(connection);
	});
	delete this.expressInstance;
	
	this.httpServer.close(function(){
		callback();
	});
};

HttpServer.prototype.getResource = function(request, response){
	var self = this,
		groupId = request.params.groupId,
		group = this.resourceMap[groupId],
		resourcePath,
		filePath;

	// HEAD requests must not return a body, OPTIONS is not handled by this server
	if(request.route.method === "options" || request.route.method === "head"){
		return response.send(200);
	} 

	if(group === void 0){
		this.log("[HTTP Server] Couldn't find requested group: " + groupId + "\n");
		return response.send(404);
	}

	// Remove the junk for group routing, decode it as it may contain encoded characters
	resourcePath = decodeURI(request.path.replace('/g/' + groupId + '/', ''));
	filePath = group[resourcePath];

	if(filePath === void 0){
		// Check to see if the file is contained in one of the directories
		// served for this group
		utils.each(group, function(value, key){
			if(~resourcePath.indexOf(key)){
				filePath = path.join(value, resourcePath.replace(key, ""));
			}
		});

		// We did our best and still can't find the file.
		if(filePath === void 0){
			this.log("[HTTP Server] Couldn't find requested file path: " + resourcePath + "\n");
			return response.send(404);
		}
	}

	fs.exists(filePath, function(exists){
		if(exists){
			if(!self.autoAdapt)	return response.sendfile(filePath);	

			// We're going to see if this is an html-like file. If it is, we're going to 
			// see if it has a testing library that we're familiar with. If it does, and 
			// it doesn't have a thrill adapter, we're going to add it in there. This is 
			// a relatively heavy operation, but it makes thrill super easy to use and 
			//can be disabled with a switch (autoAdapt).
			if(~self.autoAdaptExtensions.indexOf(path.extname(filePath))){
				serveAdaptedHtmlFile(request, response, filePath);
			} else {
				response.sendfile(filePath);	
			}
		} else { // The file doesn't exist
			response.send(404);
		}
	});
};

// Precompute the regexes used to find library and adapters in html-like files
var adaptableLibraryRegexMap = utils.map(adapters, function(path, name){
	return new RegExp('<script.*src=[\'"]?.*' + name + '.*\\.js[\'"].*?>.*</.*script.*>', 'im');
});

var adapterRegexMap = utils.map(adapters, function(path, name){
	return new RegExp('<script.*src=[\'"]?.*thrill-' + name + '-adapter.*\\.js[\'"].*?>.*</.*script.*>', 'im');
});

// Internal helper which adapts a given file path to thrill
function serveAdaptedHtmlFile(request, response, filePath){
	var self = this;
	fs.readFile(filePath, function(err, data){
		if(err) return response.send(500);
		var waitingOn = 0; // Keeps track of how many async ops we're waiting on.
		
		data = data.toString();
		
		// Try to find files for each adaptable library
		utils.each(adaptableLibraryRegexMap, function(regex, name){
			var match = data.match(regex);
			if(!match) return;

			// If an adapter already exists on this page, don't add another.
			var adapterRegex = adapterRegexMap[name];	
			if(data.match(adapterRegex)) return;

			waitingOn++;
			fs.readFile(adapters[name], function(err, adapterScript){
				waitingOn--;
		
				if(err){
					self.log("[HTTP Server] Error in reading adapter script: " + err);
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
}

HttpServer.prototype.serve = function(pathMap, run){
	var self = this,
		runUrls,
		resourceMap = this.resourceMap,
		runIsString = typeof run === "string",
		groupId = generateId(),
		uid = 0,
		groupUrl =  "http://" + self.host + "/g/" + groupId + "/",
		groupResources = resourceMap[groupId] = {};

	// This function serves a file from the root group "directory"
	function serveFile(filePath){
		var baseName,
			resourcePath;

		// Skip if this if the file is already a capable of being served by a browser
		if(~filePath.indexOf('://')) return filePath;
		
		filePath = path.resolve(filePath);
		resourcePath = "s"+ (uid++) + "_" + path.basename(filePath);
		groupResources[resourcePath] = filePath;
		self.debug('[HTTP Server] Serving ' + filePath + " as " + resourcePath + "\n");

		return groupUrl + resourcePath;
	}

	var runFileIsServed = false;
	utils.each(pathMap, function(value, key){
		var relativePath,
			filePath = value;

		groupResources[key] = filePath;
		self.debug('[HTTP Server] Serving ' + filePath + " as " + (key ? key : "root") + "\n");

		// If the run file is a string, and shares it's path with a
		// directory we're serving, then we don't need to serve it separately
		if(runIsString && run.indexOf(value) === 0){
			var file = fs.statSync(filePath);
			if(file.isDirectory()){
				run = run.replace(value, '').replace(/\\/g,'/');
				if(run[0] === "/") run = run.substr(1);
				runFileIsServed = true;
			}
		}
	});
	
	if(runIsString){
		if(runFileIsServed){ // One of our served directories contains the run file
			runUrls = groupUrl + run;	
		} else {
			runUrls = serveFile(run);
			// Since this is assumed to be an html file, we need to make the "root"
			// directory that is served the base directory of this file.
			if(!('' in groupResources)) groupResources[''] = path.dirname(run);

		}
	} else {// if it's a list of files, serve them up
		runUrls = run.map(serveFile);
	}
	
	return {
		groupId: groupId,
		runUrls: runUrls
	};
};

HttpServer.prototype.stopServing = function(groupId){
	if(groupId in this.resourceMap){
		delete this.resourceMap[groupId];
	}
};
