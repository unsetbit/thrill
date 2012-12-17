var winston = require("winston"),
	path = require('path'),
	createQueen = require('../../queen'),
	createRemoteQueen = require('../../queen-remote').client,
	createThrill = require('../lib/server/thrill.js').create,
	createThrillServer = require('../lib/server/httpServer.js').create,
	createReporter = require('../lib/server/reporter/unifiedDot.js').create,
	logger = new (winston.Logger)({transports: [new (winston.transports.Console)({level: 'info'}) ]}),
	log = logger.info.bind(logger);

var thrillServer = createThrillServer();

var scripts = thrillServer.serveFiles([
	path.resolve(path.dirname(module.filename), '../client/lib/qunit.js'),
	path.resolve(path.dirname(module.filename), '../client/lib/adapters/qunit.js'),
	path.resolve(path.dirname(module.filename), 'sample-test.js'),
	"https://raw.github.com/jquery/qunit/master/test/test.js"
]);

createRemoteQueen(onReady);

function onReady(queen){
	var thrill = createThrill(queen, { log: log, debug: log});

	thrill.on("test", function(test){
		createReporter(test);
	});

	var test = thrill({
		scripts:scripts, 
		populate:"continuous", 
		killOnStop:false
	});
}
