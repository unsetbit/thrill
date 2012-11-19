var EventEmitter = require('events').EventEmitter;
var _ = require('underscore');
exports.create = create = function(worker, options){
	var options = options || {},
		tester = new Tester(worker);

	return tester;
};

/** Lives only while a test is running

	Events:
		- start
		- end
		- suiteStart
		- suiteEnd
		- testStart
		- testEnd
		- dead
*/
exports.Tester = Tester = function(worker){
	this._worker = worker;
	this._emitter = new EventEmitter();
	this._passed = false;
	_.bindAll(this, "_startHandler",
					"_doneHandler",
					"_suiteStartHandler",
					"_suiteEndHandler",
					"_testStartHandler",
					"_testEndHandler",
					"_workerDeadHandler");

	worker.on("start", this._startHandler);
	worker.on("done", this._doneHandler);
	worker.on("suiteStart", this._suiteStartHandler);
	worker.on("suiteEnd", this._suiteEndHandler);
	worker.on("testStart", this._testStartHandler);
	worker.on("testEnd", this._testEndHandler);
	worker.on("dead", this._workerDeadHandler);
};

Tester.prototype.passed = function(){
	return this._passed;
};

Tester.prototype.getId = function(){
	return this._worker.getId();
};

Tester.prototype.getAttributes = function(){
	return this._worker.getAttributes();
};

Tester.prototype.kill = function(){
	if(this._isDead) return;
	this._isDead = true;
	
	var worker = this._worker;

	worker.removeListener("start", this._startHandler);
	worker.removeListener("done", this._doneHandler);
	worker.removeListener("suiteStart", this._suiteStartHandler);
	worker.removeListener("suiteEnd", this._suiteEndHandler);
	worker.removeListener("testStart", this._testStartHandler);
	worker.removeListener("testEnd", this._testEndHandler);
	worker.removeListener("dead", this._workerDeadHandler);

	this._emitter.emit('dead', this);
	this._emitter.removeAllListeners();
};

Tester.prototype._startHandler = function(data){
	this._emit("start", this, data);
};

Tester.prototype._doneHandler = function(data){
	this._passed = data.passed === true;
	
	this._emit("done", this, data);
	this._worker.kill();
};

Tester.prototype._suiteStartHandler = function(data){
	this._emit("suiteStart", this, data);
};

Tester.prototype._suiteEndHandler = function(data){
	this._emit("suiteEnd", this, data);
};

Tester.prototype._testStartHandler = function(data){
	this._emit("testStart", this, data);
};

Tester.prototype._testEndHandler = function(testResult){
	this._emit("testEnd", this, testResult);
};

Tester.prototype._workerDeadHandler = function(){
	this.kill();
};

// Event handlers
Tester.prototype.on = function(event, callback){
	this._emitter.on(event, callback);
};

Tester.prototype.removeListener = function(event, callback){
	this._emitter.removeListener(event, callback);
};

Tester.prototype._emit = function(){
	this._emitter.emit.apply(this._emitter, arguments);
};
