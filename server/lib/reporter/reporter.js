var utils = require('./utils.js'),
	_ = require('underscore');
	
var create = exports.create = function(manager, options){
	var options = options || {},
		reporter = new Reporter(manager);

	return reporter;
};

var Reporter = exports.Reporter = function(manager){
	this._manager = manager;
	this._currentSuite = "Main";
	this._currentTest = void 0;
	
	_.bindAll(this, '_newTesterHandler',
					'_testerStartHandler',
					'_testerDoneHandler',
					'_testerSuiteStartHandler',
					'_testerSuiteEndHandler',
					'_testerTestStartHandler',
					'_testerTestEndHandler',
					'_testerDeadHandler',
					'_managerStartHandler',
					'_managerStopHandler',
					'_managerDeadHandler');

	manager.on('newTester', this._newTesterHandler);
	manager.on('start', this._managerStartHandler);
	manager.on('stop', this._managerStopHandler);
	manager.on('dead', this._managerDeadHandler);
};

Reporter.prototype._newTesterHandler = function(tester){
	tester.on('start', this._testerStartHandler);
	tester.on('done', this._testerDoneHandler);
	tester.on('suiteStart', this._testerSuiteStartHandler);
	tester.on('suiteEnd', this._testerSuiteEndHandler);
	tester.on('testStart', this._testerTestStartHandler);
	tester.on('testEnd', this._testerTestEndHandler);
	tester.on('dead', this._testerDeadHandler);
};

Reporter.prototype._testerStartHandler = function(tester, data){};

Reporter.prototype._testerDoneHandler = function(tester, data){};

Reporter.prototype._testerSuiteStartHandler = function(tester, data){
	this._currentSuite = data.name;
};

Reporter.prototype._testerSuiteEndHandler = function(tester, data){
	this._currentSuite = void 0;
};

Reporter.prototype._testerTestStartHandler = function(tester, data){
	this._currentTest = data.name;
};

Reporter.prototype._testerTestEndHandler = function(tester, data){
	this._currentTest = void 0;
};

Reporter.prototype._testerDeadHandler = function(tester, data){};

Reporter.prototype._managerStartHandler = function(){};

Reporter.prototype._managerStopHandler = function(){};

Reporter.prototype._managerDeadHandler = function(){};