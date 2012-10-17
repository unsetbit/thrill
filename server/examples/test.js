var winston = require("winston"),
	createBullhorn = require('../../../bullhorn').bullhorn.create,
	createMinionMaster = require('../../../minion-master').minionMaster.create,
	createThrill = require('../../').thrill.create,
	createThrillServer = require('../../').thrillServer.create,
	createBullhornServer = require('../../../bullhorn').bullhornServer.create,
	createReporter = require('../lib/reporters/simpleConsole.js').create,
	logger = new (winston.Logger)({transports: [new (winston.transports.Console)({level: 'info'}) ]});


var thrill = createThrill({ logger: logger });

thrill.on("newTestManager", function(testManager){
	createReporter(testManager);
});

var httpServer = require('http').createServer().listen(80);

var thrillServer = createThrillServer(thrill, { 
	httpServer: httpServer, 
	logger: logger
});

var minionMaster = createMinionMaster({
	httpServer: httpServer,
	logger:logger
});
var bullhorn = createBullhorn({	logger:logger });
bullhorn.attachClientHub(minionMaster);
thrill.attachWorkforceProvider(bullhorn);
//minionMaster.spawnBrowser({browserName: "chrome"}, function(){});
