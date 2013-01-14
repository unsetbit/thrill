var EventEmitter = require('events').EventEmitter,
	MESSAGE_TYPE = require('../protocol.js').TESTER_MESSAGE_TYPE,
	utils = require('../utils.js');

exports.create = create = function(worker){
	var tester = new Tester(worker);

	return tester.api;
};

var getApi = function(tester){
	var api = {};
	api.on = tester.emitter.on.bind(tester.emitter);
	api.removeListener = tester.emitter.removeListener.bind(tester.emitter);
	
	Object.defineProperty(api, "id", { 
		value: tester.worker.id,
		enumerable: true 
	});
	
	Object.defineProperty(api, "passed", { 
		get: function(){return tester.passed === true;},
		enumerable: true 
	});
	
	Object.defineProperty(api, "provider", { 
		value: tester.worker.provider,
		enumerable: true 
	});
	
	return api;
};

var Tester = exports.Tester = function(worker){
	this.worker = worker;
	this.emitter = new EventEmitter();
	this.kill = utils.once(this.kill.bind(this));
	this.passed = false;
	worker.on("message", this.messageHandler.bind(this));
	worker.on("dead", this.workerDeadHandler.bind(this));

	this.api = getApi(this);
};

Tester.prototype.kill = function(){
	this.emitter.emit('dead', this);
	this.emitter.removeAllListeners();
};

Tester.prototype.messageHandler = function(message){
	switch(message[0]){
		case MESSAGE_TYPE['start']:
			this.start(message[1]);
			break;
		case MESSAGE_TYPE['end']:
			this.end(message[1]);
			break;
		case MESSAGE_TYPE['suite start']:
			this.suiteStart(message[1]);
			break;
		case MESSAGE_TYPE['suite end']:
			this.suiteEnd(message[1]);
			break;
		case MESSAGE_TYPE['test start']:
			this.testStart(message[1]);
			break;
		case MESSAGE_TYPE['test end']:
			this.testEnd(message[1]);
			break;
		case MESSAGE_TYPE['batch']:
			this.batch(message[1]);
	}
};

Tester.prototype.start = function(data){
	this.emitter.emit("start", data);
};

Tester.prototype.end = function(data){
	this.passed = data && data.passed === true;

	this.emitter.emit("end", data);
	this.worker.kill();
};

Tester.prototype.suiteStart = function(data){
	this.emitter.emit("suiteStart", data);
};

Tester.prototype.suiteEnd = function(data){
	this.emitter.emit("suiteEnd", data);
};

Tester.prototype.testStart = function(data){
	this.emitter.emit("testStart", data);
};

Tester.prototype.testEnd = function(data){
	this.emitter.emit("testEnd", data);
};

Tester.prototype.workerDeadHandler = function(){
	this.kill();
};

Tester.prototype.batch = function(messageList){
	var self = this;
	messageList.forEach(function(message){
		self.messageHandler(message);
	});
};