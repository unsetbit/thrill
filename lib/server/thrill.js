var createManager = require('./manager.js').create,
	path = require('path'),
	its = require('its'),
	EventEmitter = require('events').EventEmitter,
	utils = require('../utils.js'),
	generateId = require('node-uuid').v4,
	fs = require('fs');

var create = module.exports = function(options){
	options = options || {};
	var callback = options.callback || utils.noop;

	function onReady(queen){
		if(queen instanceof Error){
			return callback(queen);
		}
		
		var thrill = new Thrill(queen);
		
		if(options.log) thrill.log = options.log;
		if(options.debug) thrill.debug = options.debug;

		callback(getApi(thrill));
	}

	if(options.queen){
		onReady(options.queen);
	} else {
		require('../../../queen-remote').client({
			callback: onReady,
			host: options.queenHost,
			log: options.debug,
			debug: options.debug
		});
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
	its.object(queen, "Queen must be defined");

	this.id = generateId();
	this.emitter = new EventEmitter();
	this.kill = utils.once(this.kill.bind(this)); 
	this.queen = queen;
	this.managers = [];
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
