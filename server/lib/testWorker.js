var EventEmitter = require('events').EventEmitter;
var _ = require('underscore');
exports.create = create = function(client, socket, options){
	var options = options || {},
		emitter = options.emitter || new EventEmitter(),
		testWorker = new TestWorker(client, socket, emitter);

	return testWorker;
};

exports.TestWorker = TestWorker = function(client, socket, emitter){
	this._client = client;
	this._emitter = emitter;

	this._isDone = false
	this._passedCount = 0;
	this._failedCount = 0;
	this._skippedCount = 0;
	this._pendingCount = 0;
	this._runtime = 0;
	this._failedTests = [];

	_.bindAll(this, "_startHandler",
					"_endHandler",
					"_suiteStartHandler",
					"_suiteEndHandler",
					"_testStartHandler",
					"_testEndHandler");

	this._setSocket(socket);
};

TestWorker.prototype.getId = function(){
	this._socket.getId();
};

TestWorker.prototype.getDetails = function(){
	var details = {
		isDone: this._isDone,
		passedCount: this._passedCount,
		failedCount: this._failedCount,
		skippedCount: this._skippedCount,
		pendingCount: this._pendingCount,
		failedTests: this._failedTests,
		totalCount: this._failedCount + this._passedCount + this._skippedCount + this._pendingCount,
		runtime: this._runtime
	};

	return details;
};

TestWorker.prototype.getClient = function(){
	return this._client;
};

TestWorker.prototype.hasPassed = function(){
	if(this._isDone){
		return this._failedCount === 0;
	} else {
		return void 0;
	}
};

TestWorker.prototype._setSocket = function(socket){
	if(this._socket === socket){
		return;
	}

	if(this._socket !== void 0){
		this._socket.removeListener("start", this._startHandler);
		this._socket.removeListener("end", this._endHandler);
		this._socket.removeListener("suiteStart", this._suiteStartHandler);
		this._socket.removeListener("suiteEnd", this._suiteEndHandler);
		this._socket.removeListener("testStart", this._testStartHandler);
		this._socket.removeListener("testEnd", this._testEndHandler);
	}

	this._socket = socket;

	if(this._socket !== void 0){
		this._socket.on("start", this._startHandler);
		this._socket.on("end", this._endHandler);
		this._socket.on("suiteStart", this._suiteStartHandler);
		this._socket.on("suiteEnd", this._suiteEndHandler);
		this._socket.on("testStart", this._testStartHandler);
		this._socket.on("testEnd", this._testEndHandler);
	}
};

TestWorker.prototype._startHandler = function(data){
	this._emit("start", this);
};

TestWorker.prototype._endHandler = function(data){
	this._isDone = true;
	this._socket.emit("kill");
	this._emit("end", this);
};

TestWorker.prototype._suiteStartHandler = function(data){
	this._emit("suiteStart");
};

TestWorker.prototype._suiteEndHandler = function(data){
	//this._failed += data.failed;
	//this._passed += data.passed;
	this._totalRuntime += data.runtime;

	this._emit("suiteEnd");
};

TestWorker.prototype._testStartHandler = function(data){
	this._emit("testStart");
};

TestWorker.prototype._testEndHandler = function(data){
	if(data.failed === 0){
		if(data.passed > 0){
			this._passedCount += 1;
		} else if (data.skipped > 0){
			this._skippedCount += 1;
		}
	} else {
		this._failedCount += 1;
		this._failedTests.push({
			name: data.name,
			log: data.log
		});
	}

	this._emit("testEnd");
};

TestWorker.prototype.on = function(event, callback){
	this._emitter.on(event, callback);
};

TestWorker.prototype.once = function(event, callback){
	this._emitter.once(event, callback);
};

TestWorker.prototype.removeListener = function(event, callback){
	this._emitter.removeListener(event, callback);
};

TestWorker.prototype._emit = function(event, data){
	this._emitter.emit(event, data);
};
