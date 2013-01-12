var MESSAGE_TYPE = require('../protocol.js').TESTER_MESSAGE_TYPE;

var create = module.exports = function(socket){
	socket = socket || window.queenSocket || (function(){
		var results = window.location.search.match(/(?:\?|\&)queenSocketId=(.*)(?:\&|$)/);
		if(!results) throw new ReferenceError('Unable to find queen socket id in the url.');
		return window.parent.iframeSockets[results[1]];
	}());

	var thrill = new Thrill(socket);
	return thrill;
};

function Thrill(socket){
	this.socket = socket; 
}

Thrill.prototype.start = function(data){
	this.socket([MESSAGE_TYPE["start"], data]);
};

Thrill.prototype.suite = function(data){
	this.socket([MESSAGE_TYPE["suite start"], data]);
};

Thrill.prototype.test = function(data){
	this.socket([MESSAGE_TYPE["test start"], data]);
};

Thrill.prototype.testEnd = function(data){
	this.socket([MESSAGE_TYPE["test end"], data]);
};

Thrill.prototype.suiteEnd = function(data){
	this.socket([MESSAGE_TYPE["suite end"], data]);
};

Thrill.prototype.end = function(data){
	if(data && data.passed !== void 0){
		this.socket([MESSAGE_TYPE["end"], data]);
	} else {
		throw new TypeError("A \"passed\" variable is required to end the test");
	}
};