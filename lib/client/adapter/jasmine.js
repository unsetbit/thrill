var createThrill = require('../thrill.js'),
	utils = require('../../utils.js');

var adaptJasmineToThrill = module.exports = function(options){
	options = options || {};
	var jasmine = options.jasmine || window.jasmine,
		jasmineEnv,
		thrill = options.thrill || createThrill();

	jasmineEnv = jasmine.getEnv();
	jasmineEnv.addReporter(createThrillReporter(thrill));
};

function createThrillReporter(thrill){
	var reporter = {},
		startedSuites = {},
		runnerStartTime;

	reporter.reportRunnerStarting = function(runner){
		runnerStartTime = (+new Date());
		thrill.start({
			type: 'jasmine'
		});
	};

	reporter.reportSuiteStarting = function(suite){
		thrill.suite({
			name: suite.getFullName()
		});
	};


	reporter.reportSpecStarting = function(spec){
		testStartTime = new Date().getTime();
		thrill.test({
			name: spec.description,
			suiteName: spec.suite.getFullName()
		});
	};

	reporter.reportSpecResults = function(spec){
		var timeElapsed = new Date().getTime() - testStartTime,
			results = spec.results(),
			suiteName = spec.suite.getFullName();

		// Since jasmine doesn't have a hook for this, we have to
		// manually keep track and manage
		if(!(suiteName in startedSuites)){
			startedSuites[suiteName] = true;
			reporter.reportSuiteStarting(spec.suite);
		}

		data = {
			name: spec.description,
			suiteName: suiteName,
			runtime: results.skipped ? 0 : timeElapsed,
			passCount: results.passedCount,
			failCount: results.failedCount,
			log: ""
		};
		
		if(results.failedCount > 0){
			utils.each(results.getItems(), function(result){
				if(!result.passed()){
					data.log += formatError(result);
				}
			});
		}

		thrill.testEnd(data);
	};

	reporter.reportSuiteResults = function(suite){
		var results = suite.results();

		thrill.suiteEnd({
			name: suite.getFullName(),
			passCount: results.passCount,
			failCount: results.failedCount
		});
	};

	reporter.reportRunnerResults = function(runner){
		var results = runner.results(),
			timeElapsed = (+new Date()) - runnerStartTime;

		thrill.end({
			passed: results.passed(),
			passCount: results.passedCount,
			failCount: results.failedCount,
			runtime: timeElapsed
		});

		startedSuites = {};
	};

	return reporter;
}

function formatError(result) {
	var stack = result.trace.stack,
		message = result.message;

	if(stack){
		if (message && ~message.indexOf(stack.substring(0, stack.indexOf('\n') - 1))) {
			stack = message + '\n' + stack;
		}
		
		stack = stack.split(/\n/g);
		
		stack = utils.filter(stack, function(line, index, arr){
			
			if(~line.indexOf('/jasmine.js')) return false;
			
			// Remove the junk queen adds on
			// We have to address the array by index in this case
			// so the line actually gets updated
			arr[index] = line.replace(/\(.*\/g\/.*?\//,'(').replace(/\?queenSocketId=([\w\-])*/,'');
			
			return true;
		});

		return stack.join('\n');
	}

	return message;
}

// ### AUTO INITIALIZATION
if(typeof THRILL_MANUAL === "undefined" || !THRILL_MANUAL){
	adaptJasmineToThrill();
}