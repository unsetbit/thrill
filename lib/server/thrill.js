var createTest = require('./test.js').create,
	path = require('path'),
	EventEmitter = require('events').EventEmitter,
	utils = require('../utils.js'),
	generateId = require('node-uuid').v4,
	fs = require('fs');

var create = module.exports = function(callback, options){
	callback = callback || utils.noop;
	options = options || {};

	var queen = options.queen,
		thrill;

	function onReady(queen, err){
		if(!queen) return callback(void 0, err);	
		
		thrill = new Thrill(queen);
		
		if(options.log) thrill.log = options.log;
		if(options.debug) thrill.debug = options.debug;

		callback(getApi(thrill));
	}

	if(queen === void 0){
		var createQueen = require('queen-remote').client,
			queenHost = options.queenHost? options.queenHost.split(":"): "",
			queenHostname = queenHost[0] || "localhost",
			queenPort = parseInt(queenHost[1] || 9200, 10);
		
		createQueen(onReady, {
			host: queenHostname,
			port: queenPort
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

	Object.defineProperty(api, 'workerProviders', {
		enumerable: true,
		get: function(){
			return utils.values(self.workerProviders);
		}
	});
	
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
		test, 
		testId = generateId(),
		workforce;

	// If only a script array is passed in
	if(Array.isArray(config)){
		config = {run:config};
	}

	workforce = this.queen({
		run: config.run,
		timeout: config.timeout,
		populate: config.populate,
		killOnStop: config.killOnStop,
		filter: config.filter,
		autoStart: false
	});

	test = createTest(workforce, config);
	
	this.tests[testId] = test;
	
	test.api.on('dead', function(){
		self.debug('Test dead\n');
		self.emitter.emit('testDead', test.api.id);
		delete self.tests[testId];
	});

	if(config.autoStart !== false){
		test.start();
	}

	this.debug('New test\n');
	this.emitter.emit("test", test.api);

	if(config.populate !== "manual" && config.populate !== "continuous" && this.queen.workerProviders.length === 0){
		workforce.kill();
	}

	return test.api;
};
