var createThrill = require('../thrill.js'),
	utils = require('../../utils.js');

var adaptYUITestToThrill = module.exports = function(options){
	options = options || {};
	var runner = options.TestRunner || window.YAHOO.tool.TestRunner,
		thrill = options.thrill || createThrill(),
		testStartTime,
		runnerStartTime,
		testLogMessages,
		currentSuite;
	
	runner.subscribe(runner.BEGIN_EVENT, function(){
		runnerStartTime = (+new Date());
		thrill.start({
			type: 'yuitest'
		});
	});
	
	runner.subscribe(runner.TEST_SUITE_BEGIN_EVENT, function(data){
		currentSuite = data.testSuite.name;
		thrill.suite({
			name: data.testSuite.name
		});
	});

	runner.subscribe(runner.TEST_CASE_BEGIN_EVENT, function(data){
		testStartTime = (+new Date());
		testLogMessages = [];
		thrill.test({
			name: data.testCase.name,
			suiteName: currentSuite
		});
	});

	runner.subscribe(runner.TEST_FAIL_EVENT, function(data){
		testLogMessages.push(formatError(data.error));
	});

	runner.subscribe(runner.TEST_CASE_COMPLETE_EVENT, function(data){
		var timeElapsed = (+new Date()) - testStartTime;

		thrill.testEnd({
			name: data.testCase.name,
			suiteName: currentSuite,
			passCount: data.results.passed,
			failCount: data.results.failed,
			runtime: timeElapsed,
			log: testLogMessages.join('\n')
		});
	});

	runner.subscribe(runner.TEST_SUITE_COMPLETE_EVENT, function(data){
		thrill.suiteEnd({
			name: data.testSuite.name,
			passCount: data.results.passed,
			failCount: data.results.failed
		});
	});

	runner.subscribe(runner.COMPLETE_EVENT, function(data){
		var timeElapsed = (+new Date()) - runnerStartTime;
		thrill.end({
			passed: true,
			passCount: data.results.passed,
			failCount: data.results.failed,
			runtime: timeElapsed
		});
	});
};

var LIBRARY_JUNK_REGEX = /.*yuitest.*\.js/i;
var THRILL_JUNK_REGEX = /\(.*\/g\/.*?\//i;
var QUEEN_JUNK_REGEX = /\?queenSocketId=([\w\-])*/i;
var NEW_LINE_REGEX = /\n/g;

function formatError(err) {
	var stack = err.stack;

	if(!stack) return err.message;
	
	stack = stack.split(NEW_LINE_REGEX);

	stack = utils.filter(stack, function(line, index, arr){
		if(LIBRARY_JUNK_REGEX.test(line)) return false;

		// Remove the junk queen adds on
		// We have to address the array by index in this case
		// so the line actually gets updated
		arr[index] = line.replace(THRILL_JUNK_REGEX,'(').replace(QUEEN_JUNK_REGEX,'');
		
		return true;
	});
	
	return	stack.join('\n');
}

// ### AUTO INITIALIZATION
if(typeof THRILL_MANUAL === "undefined" || !THRILL_MANUAL){
	adaptYUITestToThrill();
}