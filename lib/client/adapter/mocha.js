var createThrill = require('../thrill.js'),
	utils = require('../../utils.js');

var adaptMochaToThrill = module.exports = function(options){
	options = options || {};
	var mocha = options.mocha || window.mocha,
		thrill = options.thrill || createThrill();

	mocha.setup({reporter: createThrillReporter(thrill), ui: 'bdd'});
};

function createThrillReporter(thrill){
	return function(runner){
		var runnerPassed = true,
			runnerStartTime,
			runnerFailCount = 0,
			runnerPassCount = 0;

		runner.on('start', function(){
			runnerStartTime = (+new Date());
			thrill.start({
				type: 'mocha'
			});
		});

		runner.on('suite', function(suite){
			thrill.suite({
				name: getSuiteName(suite)
			});
		});
		
		runner.on('test', function(test){
			test.__thrill_errors = [];
			thrill.test({
				name : test.title,
				suiteName : getSuiteName(test.parent)
			});
		});

		runner.on('fail', function(test, error) {
			if (test.type === 'hook' || error.uncaught) {
				test.__thrill_errors = [formatError(error)];
			} else {
				test.__thrill_errors.push(formatError(error));
			}
		});

		runner.on('test end', function(test){
			var passed = test.state === "passed";
			if(!passed) runnerPassed = false;

			thrill.testEnd({
				name: test.title,
				suiteName: getSuiteName(test.parent),
				passCount: passed? 1 : 0,
				failCount: passed? 0 : 1,
				runtime: test.timer,
				log: test.__thrill_errors.join('\n')
			});

			delete test.__thrill_errors;
		});

		runner.on('suite end', function(suite){
			var failCount = getTestsWithState("failed", suite).length,
				passCount = getTestsWithState("passed", suite).length;
			
			runnerFailCount += failCount;
			runnerPassCount += passCount;

			thrill.suiteEnd({
				name: getSuiteName(suite),
				passCount: passCount,
				failCount: failCount
			});
		});

		runner.on('end', function(){
			var timeElapsed = (+new Date()) - runnerStartTime;

			thrill.end({
				passed: runnerPassed,
				passCount: runnerPassCount,
				failCount: runnerFailCount,
				runtime: timeElapsed
			});
		});
	};
}

function formatError(error) {
	var stack = error.stack,
		message = error.message;

	if (stack) {
		if (message && !~stack.substring(0, stack.indexOf('\n')).indexOf(message)) {
			stack = message + '\n' + stack;
		}
		
		stack = stack.split(/\n/g);
		
		// Clean up the stack
		stack = utils.filter(stack, function(line, index, arr){
			if(~line.indexOf('/mocha.js')) return false;
			
			// Remove the junk queen adds on
			// We have to address the array by index in this case
			// so the line actually gets updated
			arr[index] = line.replace(/\(.*\/g\/.*?\//,'(').replace(/\?queenSocketId=([\w\-])*/,'');
		
			return true;
		});
		
		return stack.join('\n');
	} else {
		return message;
	}
}

function getSuiteName(suite){
	var name = suite.title;

	while(suite.parent){
		suite = suite.parent;
		if(!suite.title) continue;
		name = suite.title + " " + name;
	}

	return name;
}

function getTestsWithState(state, suite){
	return utils.filter(suite.tests, function(test){
		return test.state === state;
	});
}

// ### AUTO INITIALIZATION
if(typeof THRILL_MANUAL === "undefined" || !THRILL_MANUAL){
	adaptMochaToThrill();
}