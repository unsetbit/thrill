var utils = require('../../utils.js'),
	reporterUtils = require('./utils.js'),
	EventEmitter = require('events').EventEmitter,
	nodeUtil = require('util');

var create = module.exports = function(manager, options){
	options = options || {};

	var reporter = new UnifiedDotReporter(manager);

	if(options.log) reporter.log = options.log;
	if(options.debug) reporter.debug = options.debug;

	return reporter.api;
};

var getApi = function(reporter){
	var api = {};
	api.on = reporter.emitter.on.bind(reporter.emitter);
	api.removeListener = reporter.emitter.removeListener.bind(reporter.emitter);
	return api;
};

var UnifiedDotReporter = function(manager){
	var self = this;
	
	this.manager = manager;
	this.emitter = new EventEmitter();
	this.width = reporterUtils.window.width * 0.75 | 0;
	this.cursor = 0;
	
	this.testerData = {};

	manager.on('tester', this.newTesterHandler.bind(this));
	manager.on('start', this.managerStartHandler.bind(this));
	manager.on('stop', this.managerStopHandler.bind(this));

	this.api = getApi(this);

	if(manager.dead){
		setTimeout(function(){
			self.log(reporterUtils.color('bright red', "FAILED because no browsers connected\n"));
			self.emitter.emit('results', {
				passed: false,
				testerData: {}
			});
		});
	}
};

UnifiedDotReporter.prototype.log = utils.noop;
UnifiedDotReporter.prototype.debug = utils.noop;

UnifiedDotReporter.prototype.newTesterHandler = function(tester){
	var self = this;

	var testerData = {
		attributes: tester.provider.attributes,
		failures: [],
		passCount: 0
	};

	this.testerData[tester.id] = testerData;

	tester.on('testStart', function(data){
		self.testerTestStartHandler(testerData, data);
	});
	tester.on('testEnd', function(data){
		self.testerTestEndHandler(testerData, data);
	});
	tester.on('end', function(data){
		testerData.pendingCount = data.pendingCount;
		testerData.done = true;
	});
};

UnifiedDotReporter.prototype.managerStartHandler = function(){
    var browserCount = Object.keys(this.testerData).length;
    this.log(reporterUtils.color('bright white', "Test started\n"));
};

UnifiedDotReporter.prototype.managerStopHandler = function(){
	var self = this,
		browserFailCount = 0,
		browserCount = 0;

	utils.each(this.testerData, function(testerData){
		var tester = testerData.tester,
			attributes = testerData.attributes,
			failures = testerData.failures,
			failCount = failures.length,
			passCount = testerData.passCount,
            pendingCount = testerData.pendingCount,
			done = testerData.done === true,
			total = failCount + passCount;

		browserCount++;

		self.log('\n\n');

		if(!done){
			browserFailCount++;
			self.log(reporterUtils.color('bright red', attributes.name + " FAILED (TIMED OUT)"));

			failures.forEach(function(failure){
				self.log('\n  ');
				self.log(reporterUtils.color('red', failure.testName + " (" + failure.suiteName + ")"));
				self.log('\n    '+ failure.log.replace(/\n/g, '\n    '));
			});

			self.log('\n  ');
			self.log(reporterUtils.color('red',"Stopped at test: " + testerData.currentTestName + " (" + testerData.currentSuite + ")"));

		} else if(failures.length > 0){
			browserFailCount++;
			self.log(reporterUtils.color('bright red', attributes.name + " FAILED " + failCount + " of " + total + " tests"));

			failures.forEach(function(failure){
				self.log('\n  ');
				self.log(reporterUtils.color('red', failure.testName + " (" + failure.suiteName + ")"));
				self.log('\n    '+ failure.log.replace(/\n/g, '\n    '));
			});
		} else {
			self.log(reporterUtils.color('bright green', attributes.name + " PASSED " + total + " tests"));
		}

		if(pendingCount > 0){
			self.log('\n' + reporterUtils.color('bright green', attributes.name + " PENDING " + pendingCount + " tests"));
        }
	});

	var resultMessage;
	if(browserFailCount > 0){
		if(browserFailCount == browserCount){
			resultMessage = '\n\n' + reporterUtils.color('bright red', "FAILED on all browsers");
		} else {
			resultMessage = '\n\n' + reporterUtils.color('bright red', "FAILED on " + browserFailCount + " of " + browserCount + " browsers");
		}
	} else {
		resultMessage = '\n\n' + reporterUtils.color('bright green', "PASSED on all browsers");
	}
	this.log(resultMessage);
	this.log('\n');

	this.emitter.emit('results', {
		passed: (browserFailCount === 0),
		testerData: this.testerData
	});
};

UnifiedDotReporter.prototype.testerTestStartHandler = function(testerData, data){
	testerData.currentTestName = data.name;
	testerData.currentSuite = data.suite;
};

UnifiedDotReporter.prototype.testerTestEndHandler = function(testerData, data){
	if ((this.cursor % this.width) === 0) this.log('\n  ');
	this.cursor++;

	if(data.failCount > 0){
		testerData.failures.push({
			log: data.log,
			testName: data.name,
			suiteName: data.suite
		});
		this.log(reporterUtils.color('bright red', reporterUtils.symbols.dot));
	} else {
		testerData.passCount++;
		this.log(reporterUtils.color('bright green', reporterUtils.symbols.dot));
	}
};
