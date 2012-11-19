var winston = require("winston"),
	path = require('path'),
	createReporter = require('../lib/reporter/unifiedDot.js').create,
	reporter = require('../lib/reporter/reporter.js').Reporter,
	createMinionMaster = require('../../../minion-master').minionMaster.create,
	createThrill = require('../../').thrill.create,
	createThrillServer = require('../../').thrillServer.create,
	logger = false; //new (winston.Logger)({transports: [new (winston.transports.Console)({level: 'info'}) ]});

var httpServer = require('http').createServer().listen(80, 'localhost');
var thrillServer = createThrillServer({ httpServer: httpServer, logger: logger });

var scripts = thrillServer.serveFiles([
	path.resolve(path.dirname(module.filename), '../../client/lib/qunit.js'),
	path.resolve(path.dirname(module.filename), '../../client/lib/adapters/qunit.js'),
	path.resolve(path.dirname(module.filename), 'sample-tests.js')
]);

var minionMaster = createMinionMaster({
	httpServer: httpServer,
	logger:logger
});

var thrill = createThrill(minionMaster, { logger: logger });

thrill.on("newTestManager", function(testManager){
	createReporter(testManager);
});

var count = 0;
minionMaster.on("workerProviderConnected", function(){
	count++;
	if(count === 3){
		var testManager = thrill.run({
				scripts: scripts
			}
		);
		count = 0;

		testManager.on("stop", function(){
			var exitCode = 0;
			if(!testManager.passed()){
				exitCode = 1;
			}

			minionMaster.kill();
			thrill.kill();
			process.exit(exitCode);
		});	
	}
});
