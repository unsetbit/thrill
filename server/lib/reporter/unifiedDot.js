var utils = require('./utils.js'),
	EventEmitter = require('events').EventEmitter,
	_ = require('underscore'),
	nodeUtil = require('util');

var create = exports.create = function(manager, options){
	var options = options || {},
		reporter = new UnifiedDotReporter(manager);

	return reporter;
};

var UnifiedDotReporter = exports.UnifiedDotReporter = function(manager){
	this._manager = manager;
	this._emitter = new EventEmitter();
  	this._width = utils.window.width * .75 | 0;
    this._cursor = 0;
	
	this._testerData = {};
	
	_.bindAll(this, '_newTesterHandler',
					'_testerTestStartHandler',
					'_testerTestEndHandler',
					'_managerStartHandler',
					'_managerStopHandler');

	manager.on('newTester', this._newTesterHandler);
	manager.on('start', this._managerStartHandler);
	manager.on('stop', this._managerStopHandler);
};

UnifiedDotReporter.prototype._newTesterHandler = function(tester){
	var testerId = tester.getId();

	this._testerData[testerId] = {
		attributes: tester.getAttributes(),
 		failures: [],
 		passCount: 0
 	};

	tester.on('testStart', this._testerTestStartHandler);
	tester.on('testEnd', this._testerTestEndHandler);
};

UnifiedDotReporter.prototype._managerStartHandler = function(){
    var browserCount = _.keys(this._testerData).length;
    process.stdout.write('\n' + utils.color('bright white', "Test started with " + browserCount + " browsers") );
    process.stdout.write('\n\n');
};

UnifiedDotReporter.prototype._managerStopHandler = function(){
    var self = this,
    	browserFailCount = 0,
    	browserCount = 0;
    
    process.stdout.write('\n');
    _.each(this._testerData, function(testerData){
    	var tester = testerData.tester,
    		attributes = testerData.attributes,
    		failures = testerData.failures,
    		failCount = failures.length,
    		passCount = testerData.passCount,
    		total = failCount + passCount; 

    	browserCount++;
	    
	    process.stdout.write('\n');
		if(failures.length > 0){
			browserFailCount++;
			process.stdout.write(utils.color('bright red', attributes.name + " FAILED " + failCount + " of " + total + " tests"));

	    	failures.forEach(function(failure){
				process.stdout.write('\n  ');
				process.stdout.write(utils.color('red', failure.testName + " (" + failure.suiteName + ")"));
				process.stdout.write('\n    '+ failure.log.replace(/\n/g, '\n    '));
	    	});
	    } else {
			process.stdout.write(utils.color('bright green', attributes.name + " PASSED " + total + " tests"));
	    }
    });

    if(browserFailCount > 0){
		process.stdout.write('\n\n' + utils.color('bright red', "FAILED on " + browserFailCount + " of " + browserCount + " browsers"));
    } else {
		process.stdout.write('\n\n' + utils.color('bright green', "PASSED on all browsers"));
    }
    process.stdout.write('\n');

    this._emit('results', this._testerData);
};

UnifiedDotReporter.prototype._testerTestStartHandler = function(tester, data){
	//process.stdout.write(utils.color('bright black', utils.symbols.dot));
};

UnifiedDotReporter.prototype._addFailure = function(tester, data){
	var	testerId = tester.getId(),
		failureList = this._testerFailures[testerId] || this._testerFailures[testerId] = [];
		tester = this._testers[tester]
};

UnifiedDotReporter.prototype._testerTestEndHandler = function(tester, data){
    var testerId = tester.getId();
    var testerData = this._testerData[testerId];

    this._cursor++;

    if (this._cursor % this._width == 0) process.stdout.write('\n  ');
    //utils.cursor.back();
	if(data.failCount > 0){
		testerData.failures.push({
			log: data.log,
			testName: data.name,
			suiteName: data.suite
		});
		process.stdout.write(utils.color('bright red', utils.symbols.dot));
    } else {
	    testerData.passCount++;
	    process.stdout.write(utils.color('bright green', utils.symbols.dot)); //utils.symbols.dot
	}
};

// Event handlers
UnifiedDotReporter.prototype.on = function(event, callback){
	this._emitter.on(event, callback);
};

UnifiedDotReporter.prototype.removeListener = function(event, callback){
	this._emitter.removeListener(event, callback);
};

UnifiedDotReporter.prototype._emit = function(){
	this._emitter.emit.apply(this._emitter, arguments);
};
