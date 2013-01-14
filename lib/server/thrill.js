var createManager = require('./manager.js').create,
	path = require('path'),
	precondition = require('precondition'),
	EventEmitter = require('events').EventEmitter,
	utils = require('../utils.js'),
	generateId = require('node-uuid').v4,
	fs = require('fs');

var create = module.exports = function(callback, options){
	options = options || {};
	
	if(callback && typeof callback !== "function"){
		options = callback;
		callback = utils.noop;
	} else if(!options.queen){
		precondition.checkDefined(callback, "A callback is required");	
	}

	var queen = options.queen;
	
	function onReady(queen, err){
		if(!queen) return callback(void 0, err);	
		
		var thrill = new Thrill(queen);
		
		if(options.log) thrill.log = options.log;
		if(options.debug) thrill.debug = options.debug;

		callback(thrill.api);
		return thrill.api;
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
		return onReady(queen);
	}
};

var getApi = function(thrill){
	var api = thrill.getManager.bind(thrill);
	api.on = thrill.emitter.on.bind(thrill.emitter);
	api.removeListener = thrill.emitter.removeListener.bind(thrill.emitter);
	api.kill = thrill.kill;
	return api;
};

var Thrill = function(queen){
	precondition.checkDefined(queen, "Queen must be defined");

	this.id = generateId();
	this.emitter = new EventEmitter();
	this.kill = utils.once(this.kill.bind(this)); 
	this.queen = queen;
	this.managers = [];
	this.api = getApi(this);
};

Thrill.prototype.log = utils.noop;
Thrill.prototype.debug = utils.noop;

Thrill.prototype.kill = function(){
	utils.each(this.managers, function(manager){
		manager.kill();
	});
	
	this.emitter.emit("dead");
	this.queen.kill();	
};

Thrill.prototype.getManager = function(config){
	var self = this,
		manager,
		managerId = generateId(),
		workforce;

	workforce = this.queen({
		run: config.run,
		timeout: config.timeout,
		populate: config.populate,
		killOnStop: config.killOnStop,
		filter: config.filter,
		autoStart: false
	});

	manager = this.managers[managerId] = createManager(workforce, config);
	
	manager.api.on('dead', function(){
		self.debug('Manager dead\n');
		self.emitter.emit('managerDead', manager.api.id);
		delete self.managers[managerId];
	});

	this.debug('New manager\n');
	this.emitter.emit("manager", manager.api);
	
	if(config.autoStart !== false){
		// Delay execution so things get a chance to bind to events
		process.nextTick(manager.start.bind(manager));
	}

	// If this was a one-time population, and there's nothingn to populate the workforce
	// with, then kill it now.
	if(config.populate !== "manual" && config.populate !== "continuous" && this.queen.workerProviders.length === 0){
		// Delay execution so things get a chance to bind to events
		process.nextTick(workforce.kill.bind(workforce));
	}
	
	return manager.api;
};
