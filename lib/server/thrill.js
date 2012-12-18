var _ = require("underscore"),
	createTest = require('./test.js').create,
	path = require('path'),
	EventEmitter = require('events').EventEmitter,
	utils = require('../utils.js'),
	generateId = require('node-uuid').v4,
	createHttpServer = require('./httpServer'),
	fs = require('fs');

var create = module.exports = function(callback, options){
	var options = options || {},
		queen = options.queen,
		httpServer = options.httpServer,
		thrill;

	function onReady(queen){
		thrill = new Thrill(queen);

		if(options.log) thrill.log = options.log;
		if(options.debug) thrill.debug = options.debug;

		if(_.isFunction(callback)){
			callback(getApi(thrill));
		}
	}

	if(queen === void 0){
		var createQueen = require('queen-remote').client;
		
		createQueen(onReady, {
			port: options.queenPort,
			host: options.queenHost
		});
	} else {
		onReady(queen);
	}
};

var getApi = function(thrill){
	var api = thrill.getTest.bind(thrill);
	api.on = thrill.emitter.on.bind(thrill.emitter);
	api.removeListener = thrill.emitter.removeListener.bind(thrill.emitter);
	api.kill = thrill.kill;
	return api;
};

var Thrill = function(queen, emitter){
	this.id = generateId();
	this.emitter = new EventEmitter();
	this.kill = utils.once(this.kill.bind(this)); 
	this.queen = queen;
	this.tests = [];
};

Thrill.prototype.log = utils.noop;
Thrill.prototype.debug = utils.noop;

Thrill.prototype.kill = function(){
	this.tests.forEach(function(test){
		test.kill();
	});
	this.emitter.emit("dead");
	this.queen.kill();	
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
		timeout: config.timeout,
		populate: config.populate,
		killOnStop: config.killOnStop,
		filter: config.filter,
		autoStart: false
	});
	
	test = createTest(workforce, config);
	
	this.tests[testId] = test;
	
	test.api.on('dead', function(){
		self.debug('Test dead');
		self.emitter.emit('testDead', test.api.id);
		delete self.tests[testId];
	});

	if(config.autoStart !== false){
		test.start();
	}

	this.debug('New test');
	this.emitter.emit("test", test.api);

	return test.api;
};
