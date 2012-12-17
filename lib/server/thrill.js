var _ = require("underscore"),
	createTest = require('./test.js').create,
	path = require('path'),
	EventEmitter = require('events').EventEmitter,
	utils = require('../utils.js'),
	generateId = require('node-uuid').v4,
	fs = require('fs');

var create = module.exports = function(queen, options){
	var options = options || {},
		thrill = new Thrill(queen);

	if(options.logger) thrill.log = options.logger;

	return getApi(thrill);
};

var getApi = function(thrill){
	var api = thrill.getTest.bind(thrill);
	api.on = thrill.emitter.on.bind(thrill.emitter);
	api.removeListener = thrill.emitter.removeListener.bind(thrill.emitter);
	return api;
};

var Thrill = function(queen, emitter){
	this.id = generateId();
	this.emitter = new EventEmitter();
	
	this.queen = queen;
	this.tests = [];
};

Thrill.prototype.log = utils.noop;

Thrill.prototype.kill = function(){
	this.tests.forEach(function(test){
		test.kill();
	});
	this.emitter.emit("dead");
};

Thrill.prototype.getTest = function(config){
	var self = this,
		testManager, 
		testId = generateId(),
		workforce;

	// If only a script array is passed in
	if(Array.isArray(config)){
		config: {scripts:config};
	}

	var workforce = this.queen({
		scripts: config.scripts,
		populate: config.populate,
		killOnStop: config.killOnStop,
		autoStart: false
	});
	
	test = createTest(workforce, config);
	
	this.tests[testId] = test;
	
	test.api.on('dead', function(){
		self.log('Test dead');
		self.emitter.emit('testDead', test.api.id);
		delete self.tests[testId];
	});

	if(config.autoStart !== false){
		test.start();
	}

	this.log('New test');
	this.emitter.emit("test", test.api);

	return test.api;
};
