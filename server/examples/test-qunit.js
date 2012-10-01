var winston = require("winston"),
	createBullhorn = require('../../../bullhorn').bullhorn.create,
	createMinionMaster = require('../../../minion-master').minionMaster.create,
	createThrill = require('../../').thrill.create,
	createThrillServer = require('../../').thrillServer.create,
	createBullhornServer = require('../../../bullhorn').bullhornServer.create,
	createReporter = require('../lib/reporters/simpleConsole.js').create,
	logger = new (winston.Logger)({transports: [new (winston.transports.Console)({level: 'debug'}) ]});

var httpServer = require('http').createServer().listen(80);

var thrillServer = createThrillServer({ httpServer: httpServer, logger: logger });

var minionMaster = createMinionMaster({
	httpServer: httpServer,
	logger:logger
});

var bullhorn = createBullhorn({	logger:logger });
bullhorn.attachClientHub(minionMaster);

var thrill = createThrill({ server: thrillServer, logger: logger });
thrill.attachWorkforceProvider(bullhorn);

thrill.on("newTestManager", function(testManager){
	createReporter(testManager);
});

minionMaster.spawnBrowser({browserName: "firefox"}, function(){
	var testManager = thrill.run({
		workerFilters: [{family: "Firefox"}],
		scripts: [
			path.resolve(path.dirname(module.filename), '../../client/lib/qunit.js'),
			path.resolve(path.dirname(module.filename), '../../client/lib/adapters/qunit.js'),
			'https://raw.github.com/jquery/qunit/master/test/test.js',
			'https://raw.github.com/jquery/qunit/master/test/deepEqual.js',
			'https://raw.github.com/jquery/qunit/master/test/swarminject.js'
		],
		callback: function(results){
			console.log("done");
			if(results.passed === true){
				process.exit(0);
			} else {
				process.exit(1);
			}
		}
	});

	testManager.on("stopped", function(){
		var results = testManager.getResults();

		minionMaster.kill(function(){
			bullhorn.kill();
			thrill.kill();
	
			if(results.passed === true){
				process.exit(0);
			} else {
				process.exit(1);
			}
		});
		
	});
});


