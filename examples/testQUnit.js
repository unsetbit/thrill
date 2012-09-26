var winston = require("winston"),
	createBullhorn = require('../../bullhorn').bullhorn.create,
	createMinionMaster = require('../../minion-master').minionMaster.create,
	createThrill = require('../').thrill.create,
	logger = new (winston.Logger)({transports: [new (winston.transports.Console)() ]});


minionMaster = createMinionMaster({logger:logger});
var httpServer = minionMaster.getHttpServer();

bullhorn = createBullhorn({
	logger: logger, 
	serverConfig: { server: httpServer },
	clientHub: minionMaster.getBrowserHub()
});

thrill = createThrill({
	logger: logger,
	workforceProvider: bullhorn,
	httpServer: httpServer
});

thrill.runContinuously([
		'client/lib/qunit.js',
		'client/lib/adapter/qunit.js',
		'https://raw.github.com/jquery/qunit/master/test/test.js',
		'https://raw.github.com/jquery/qunit/master/test/deepEqual.js',
		'https://raw.github.com/jquery/qunit/master/test/swarminject.js'
], function(results){
	console.log("done");
	if(results.passed === true){
		process.exit(0);
	} else {
		process.exit(1);
	}
});
