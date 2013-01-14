var utils = require('../../utils.js'),
	EventEmitter = require('events').EventEmitter,
	mocha = require('mocha'),
	mochaReporters = mocha.reporters;

var DotReporter = mochaReporters.Dot;

var create = module.exports = function(manager, options){
	options = options || {};

	var	params = options.params || [],
		reporterType = params[0] || "Dot",
		MochaReporterConstructor = mochaReporters[reporterType],
		reporter = new MochaReporter(manager, MochaReporterConstructor);

	if(options.log) reporter.log = options.log;
	if(options.debug) reporter.debug = options.debug;

	return reporter.api;
}

function getApi(reporter){
	var api = {};
	api.on = reporter.emitter.on.bind(reporter.emitter);
	api.removeListener = reporter.emitter.removeListener.bind(reporter.emitter);
	return api;
}

function MochaSuite(){
	var title = this.title = "Thrill Test";
	this.fullTitle = function(){ return title; }
	this.suites = [];
}

var MochaReporter = function(manager, MochaReporterConstructor){
	var self = this;

	this.mochaRunner = new EventEmitter();
	this.mochaRunner.total = 0;
	this.mochaRunner.suite = new MochaSuite();
	this.mochaRunner.grepTotal = function(){return self.mochaRunner.total;};

	this.mochaReporter = new MochaReporterConstructor(this.mochaRunner);

	this.manager = manager;
	this.emitter = new EventEmitter();
	
	this.testerData = {};
	this.passed = true;
	
	manager.on('tester', this.testerHandler.bind(this));
	manager.on('start', this.managerStartHandler.bind(this));
	manager.on('stop', this.managerStopHandler.bind(this));

	this.api = getApi(this);

	if(manager.dead){
		setTimeout(function(){
			self.emitter.emit('results', {
				passed: false,
				testerData: {}
			});
		});
	}
}

MochaReporter.prototype.log = utils.noop;
MochaReporter.prototype.debug = utils.noop;

MochaReporter.prototype.managerStartHandler = function(){
	this.mochaRunner.emit('start');
};

MochaReporter.prototype.managerStopHandler = function(){
	this.mochaRunner.emit('end');
	
	this.emitter.emit('results', {
		passed: this.passed
	});
};

MochaReporter.prototype.testerHandler = function(tester){
	var self = this;

	tester.on('testStart', function(data){
		var test = new MochaTest(data, tester);
		self.mochaRunner.emit('test', test);
	});


	tester.on('testEnd', function(data){
		var test = new MochaTest(data, tester);

		if(data.failCount > 0){
			self.passed = false;
			self.mochaRunner.emit('fail', test, test.err);
		} else {
			self.mochaRunner.emit('pass', test);
		}
		self.mochaRunner.total++;
		self.mochaRunner.emit('test end', test, test.err);
	});
};

function MochaTest(data, tester){
	var title = this.title = data.name;
	this.state = data.failCount? "failed": "passed";
	this.slow = function(){return Infinity;};
	this.duration = data.runtime;
	this.fullTitle = function(){ return (data.suiteName? data.suiteName + " - " : "") + title; }
	this.fn = "Code Unavailable";
	this.parent = {
		fullTitle: function(){ return data.suiteName; }
	}
	if(data.failCount){
		var message = data.log.split('\n')[0],
			stack = data.log;

		this.err = {	
			message: message, 
			stack:  tester.provider + ": " +  stack 
		};
	}
}