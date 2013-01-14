var createThrill = require('../thrill.js'),
	utils = require('../../utils.js');

var adaptQUnitToThrill = module.exports = function(options){
	options = options || {};
	var qunit = options.qunit || window.QUnit,
		thrill = options.thrill || createThrill(),
		testStartTime, 
		testLogMessages;

	// When test suite begins
	qunit.begin(function(){
		thrill.start({
			type: 'qunit'
		});
	});

	// When module starts
	qunit.moduleStart(function(details){
		thrill.suite({
			name: details.name
		});
	});

	// When a test block begins
	qunit.testStart(function(details) {
		thrill.test({
			name : details.name,
			suiteName : details.module
		});

		testStartTime = (+new Date());
		testLogMessages = [];
	});

	// When an assertion completes
	qunit.log(function(details) {
		// If the assertion failed, record it's message and trace
		if (!details.result) {
			testLogMessages.push(formatError(details));
		}
	});

	// When a test block ends
	qunit.testDone(function(details) {
		var timeElapsed = (+new Date()) - testStartTime;

		thrill.testEnd({
			name: details.name,
			suiteName: details.module,
			passCount: details.passed,
			failCount: details.failed,
			runtime: timeElapsed,
			log: testLogMessages.join('\n')
		});
	});

	// When a module ends
	qunit.moduleDone(function(details){
		thrill.suiteEnd({
			name: details.name,
			failCount: details.failed,
			passCount: details.passed
		});
	});

	// When a test suite ends
	qunit.done(function(details) {
		thrill.end({
			passed: details.failed === 0,
			passCount: details.passed,
			failCount: details.failed,
			runtime: details.runtime
		});
		
		// Clean up
		testStartTime = null;
		testLogMessages = null;
	});
};

var LIBRARY_JUNK_REGEX = /.*qunit.*\.js/i;
var THRILL_JUNK_REGEX = /\(.*\/g\/.*?\//i;
var QUEEN_JUNK_REGEX = /\?queenSocketId=([\w\-])*/i;
var NEW_LINE_REGEX = /\n/g;

function formatError(details) {
	var message = details.message || "",
		stack = details.source;

	if (details.result) return message;
	
	if (details.expected) {
		message += " (Expected: " + details.expected + ", Actual: "	+ details.actual + ")";
	}

	if (stack) {
		stack = stack.split(NEW_LINE_REGEX);

		stack = utils.filter(stack, function(line, index, arr){
			if(LIBRARY_JUNK_REGEX.test(line)) return false;

			// Remove the junk queen adds on
			// We have to address the array by index in this case
			// so the line actually gets updated
			arr[index] = line.replace(THRILL_JUNK_REGEX,'(').replace(QUEEN_JUNK_REGEX,'');
			
			return true;
		});
		
		message += (message ? "\n" : "" ) + stack.join('\n');
	}

	return message;
}

// ### AUTO INITIALIZATION
if(typeof THRILL_MANUAL === "undefined" || !THRILL_MANUAL){
	adaptQUnitToThrill();
}