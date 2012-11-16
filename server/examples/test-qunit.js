var winston = require("winston"),
	path = require('path'),
	createMinionMaster = require('../../../minion-master').minionMaster.create,
	createThrill = require('../../').thrill.create,
	createThrillServer = require('../../').thrillServer.create,
	createReporter = require('../lib/reporters/simpleConsole.js').create,
	logger = new (winston.Logger)({transports: [new (winston.transports.Console)({level: 'info'}) ]});

var thrillServer = createThrillServer({ logger: logger });

var minionMaster = createMinionMaster({
	httpServer: thrillServer,
	logger:logger
});

var thrill = createThrill({ logger: logger });
thrill.attachWorkforceProvider(minionMaster);

thrill.on("newTestManager", function(testManager){
	createReporter(testManager);
});

minionMaster.on("workerProviderConnected", function(){
	var testManager = thrill.run({
		workerFilters: [{family: "Firefox"}, {family:"Chrome"}],
		context: [
			path.resolve(path.dirname(module.filename), '../../client/lib/qunit.js'),
			path.resolve(path.dirname(module.filename), '../../client/lib/adapters/qunit.js'),
			'https://raw.github.com/jquery/qunit/master/test/test.js',
			'https://raw.github.com/jquery/qunit/master/test/deepEqual.js',
			'https://raw.github.com/jquery/qunit/master/test/swarminject.js'
		]
	});

	testManager.on("stopped", function(){
		var results = testManager.getResults();

		minionMaster.kill(function(){
			thrill.kill();
	
			if(results.passed === true){
				process.exit(0);
			} else {
				process.exit(1);
			}
		});
		
	});	
});


