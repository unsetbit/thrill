var _ = require('underscore');

exports.create = create = function(manager){
	var simpleConsoleReporter = new SimpleConsoleReporter(manager);
	return simpleConsoleReporter;
};

exports.SimpleConsoleReporter = SimpleConsoleReporter = function(manager){
	_.bindAll(this, "_newWorkerHandler",
					"_startHandler",
					"_endHandler");
	this._manager = manager;
	this._manager.on("newWorker", this._newWorkerHandler);
};

SimpleConsoleReporter.prototype._newWorkerHandler = function(worker){
	worker.on("start", this._startHandler);
	worker.on("end", this._endHandler);
};

SimpleConsoleReporter.prototype._startHandler = function(worker, data){
	var client = worker.getClient();
	var attributes = client.getAttributes();
	var name = attributes.name;
	console.log(name + " starting testing");
};

SimpleConsoleReporter.prototype._endHandler = function(worker, data){
	var client = worker.getClient();
	var attributes = client.getAttributes();
	var name = attributes.name;
	var details = worker.getDetails();

	if(details.failed === 0){
		console.log("********************************************************************************")
		console.log(name + " PASSED");
		console.log("********************************************************************************")
	} else {
		console.log("********************************************************************************")
		console.log(name + " FAILED " + details.failedCount + " of " + details.totalCount + " tests.");
		details.failedTests.forEach(function(failedTest){
			console.log("-----------------------------------------------------------------------------");
			console.log("[" + failedTest.name + "] " + failedTest.log);
		});
		console.log("********************************************************************************")
	}
};