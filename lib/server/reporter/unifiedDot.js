var utils = require('./utils.js'),
	EventEmitter = require('events').EventEmitter,
	_ = require('underscore'),
	nodeUtil = require('util');

var create = module.exports = function(manager, options){
	var options = options || {},
		reporter = new UnifiedDotReporter(manager);

	return reporter.api;
};

var getApi = function(reporter){
	var api = {};
	api.on = reporter.emitter.on.bind(reporter.emitter);
	api.removeListener = reporter.emitter.removeListener.bind(reporter.emitter);
	return api;
};

var UnifiedDotReporter = function(manager){
	this._manager = manager;
	this.emitter = new EventEmitter();
  	this._width = utils.window.width * .75 | 0;
    this._cursor = 0;
	
	this._testerData = {};
	
	_.bindAll(this, '_newTesterHandler',
					'_testerTestStartHandler',
					'_testerTestEndHandler',
					'_managerStartHandler',
					'_managerStopHandler');

	manager.on('tester', this._newTesterHandler);
	manager.on('start', this._managerStartHandler);
	manager.on('stop', this._managerStopHandler);

	this.api = getApi(this);
};

UnifiedDotReporter.prototype._newTesterHandler = function(tester){
	var self = this;

	var testerData = {
		attributes: tester.provider.attributes,
 		failures: [],
 		passCount: 0
 	};

	this._testerData[tester.id] = testerData;

	tester.on('testStart', function(data){
		self._testerTestStartHandler(testerData, data);
	});
	tester.on('testEnd', function(data){
		self._testerTestEndHandler(testerData, data);
	});
};

UnifiedDotReporter.prototype._managerStartHandler = function(){
    var browserCount = _.keys(this._testerData).length;
    process.stdout.write('\n' + utils.color('bright white', "Test started") );
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

    this.emitter.emit('results', this._testerData);
};

UnifiedDotReporter.prototype._testerTestStartHandler = function(testerData, data){
	//process.stdout.write(utils.color('bright black', utils.symbols.dot));
};

UnifiedDotReporter.prototype._testerTestEndHandler = function(testerData, data){
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
