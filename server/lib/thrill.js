var _ = require("underscore"),
	createTestManager = require('./testManager.js').create,
	createReporter = require('./reporters/simpleConsole.js').create,
	staticServer = require('node-static'),
	path = require('path'),
	uuid = require('node-uuid'),
	EventEmitter = require('events').EventEmitter,
	fs = require('fs');

exports.create = create = function(options){
	var options = options || {},
		emitter = options.emitter || new EventEmitter(),
		fileServer = options.fileServer || new staticServer.Server(),
		thrill = new Thrill(emitter, fileServer);

	if(options.workforceProvider){
		thrill.attachWorkforceProvider(options.workforceProvider);
	}

	if(options.httpServer){
		thrill.setHttpServer(options.httpServer);
	}

	if(options.logger){
		thrill.setLogger(options.logger);
	}

	return thrill;
};

exports.Thrill = Thrill = function(emitter, fileServer){
	this._continuousTestManagers = [];
	this._workforceProviders = [];
	this._fileMaps = {};
	this._id = uuid.v4();
	this._emitter = emitter;
	this._httpServer = void 0;
	this._fileServer = fileServer;
	this._baseWebPath = "/thrill";
	this._logger = void 0;
	this._loggingFunctions = void 0;
	this._urlPattern = new RegExp("(" + this._baseWebPath + ")/(.+)/(.+)", "i");

	_.bindAll(this, "_httpRequestHandler");
};

Thrill.prototype.eventsToLog = [
	["info", "started", "Started"]
];

Thrill.prototype.getId = function(){
	return this._id;
};

Thrill.prototype.setLogger = function(logger){
	if(this._logger === logger){
		return; // same as existing one
	}
	
	var prefix = "[Thrill-" + this.getId().substr(0,4) + "] ";
	
	if(this._logger !== void 0){
		stopLoggingEvents(this, this._loggingFunctions);
	};

	this._logger = logger;

	if(this._logger !== void 0){
		this._loggingFunctions = logEvents(logger, this, prefix, this.eventsToLog);
	};
};

Thrill.prototype.setHttpServer = function(httpServer){
	if(this._httpServer === httpServer){
		return;
	}

	if(this._httpServer !== void 0){
		this._httpServer.removeListener("request", this._httpRequestHandler);
	}

	this._httpServer = httpServer;

	if(this._httpServer !== void 0){
		this._httpServer.on("request", this._httpRequestHandler);
	}
};

Thrill.prototype._serveLocalFiles = function(directory, originalFiles){
	// Serve local files via http server
	var self = this,
		files = [],
		localFileMap = {};

	originalFiles.forEach(function(file){
		var baseName;

		if(file.indexOf('http') === 0){
			files.push(file);
			return;
		}
		
		file = path.resolve(file);
		baseName = path.basename(file);

		// If another file of same name exists, generate a unique filename
		if(localFileMap[baseName] !== void 0){
			baseName = uuid.v4() + "-" + baseName;
		}
		files.push(self._baseWebPath + "/" + directory + "/" + baseName);
		localFileMap[baseName] = file;
	});

	this._fileMaps[directory] = localFileMap;
	
	return files;
};

Thrill.prototype._stopServingLocalFiles = function(directory){
	if(this._fileMaps[directory]){
		delete this._fileMaps[directory];
	}
};

Thrill.prototype._httpRequestHandler = function(request, response){
	var self = this;
	if(request.url.indexOf(this._baseWebPath) !== 0){
		return; // Only handle the thrill namespace
	}

	request.addListener('end', function () {
		var regexValues = request.url.match(self._urlPattern);
		var fileMap = regexValues[2];
		var fileKey = regexValues[3];

		var fileMap = self._fileMaps[fileMap];
		if(fileMap === void 0){
			return;
		}

		var realFilePath = fileMap[fileKey];
		console.log(realFilePath);	
		var promise = new EventEmitter;
		fs.stat(realFilePath, function (e, stat) {
	        if (e) {
	        	return;
	        }

	        self._fileServer.respond(null, 200, {}, [realFilePath], stat, request, response, function (status, headers) {
	            self._fileServer.finish(status, headers, request, response, promise);
	        });
	    });     
	});
};

Thrill.prototype.attachWorkforceProvider = function(workforceProvider){
	this._workforceProviders.push(workforceProvider);

	this._continuousTestManagers.forEach(function(testManager){
		var workforce = workforceProvider.getContinuousWorkforce();
		testManager.addWorkforce(workforce);
	});
};

Thrill.prototype.detachWorkforceProvider = function(workforceProvider){
	var index = _.indexOf(this._workforceProviders, workforceProvider);

	if(index > -1){
		this._workforceProviders.splice(index, 1);
	}
};

Thrill.prototype.createContinuousTestManager = function(files){
	var self = this,
		uid = uuid.v4(),
		files = this._serveLocalFiles(uid, files),
		testManager = createTestManager({files: files, logger: this._logger});
	createReporter(testManager);

	this._workforceProviders.forEach(function(workforceProvider){
		var workforce = workforceProvider.createContinuousWorkforce();
		testManager.addWorkforce(workforce);
	});

	this._continuousTestManagers.push(testManager);
	testManager.on("done", function(){
		self._removeContinuousTestManager(testManager);
		self._stopServingLocalFiles(uid);
	});

	return testManager;
};

Thrill.prototype._removeContinuousTestManager = function(testManager){
	var index = _.indexOf(this._continousTestManagers, testManager);

	if(index > -1){
		this._continousTestManagers.splice(index, 1);
	}
};

Thrill.prototype.runContinuously = function(files){
	var testManager = this.createContinuousTestManager(files);
	testManager.start();
	return testManager;
};

Thrill.prototype.createTestManager = function(files){
	var self = this,
		uid = uuid.v4(),
		files = this._serveLocalFiles(uid, files),
		testManager = createTestManager({files: files, logger: this._logger});

	createReporter(testManager);

	this._workforceProviders.forEach(function(workforceProvider){
		var workforce = workforceProvider.createWorkforce();
		testManager.addWorkforce(workforce);
	});

	testManager.on("done", function(){
		self._stopServingLocalFiles(uid);
	});

	return testManager;
};

Thrill.prototype.run = function(files, callback){
	var testManager = this.createTestManager(files);
	
	testManager.start();
	testManager.on("stopped", function(){
		callback(testManager.getResults());
		testManager.destroy();
	});

	return testManager;
};

Thrill.prototype.on = function(event, callback){
	this._emitter.on(event, callback);
};


Thrill.prototype.once = function(event, callback){
	this._emitter.once(event, callback);
};

Thrill.prototype.removeListener = function(event, callback){
	this._emitter.removeListener(event, callback);
};

Thrill.prototype._emit = function(event, data){
	this._emitter.emit(event, data);
};
