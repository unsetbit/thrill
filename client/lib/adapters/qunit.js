(function(){
	var MESSAGE_TYPE = {
		"start": 1, // [1]
		"done": 2, // [2, PASSED]
		"suite start": 3, // [3]
		"suite end": 4, // [4]
		"test start": 5, // [5]
		"test end": 6 // [6]
	};

	function adaptQUnitToThrill(qunit, socket) {
		var testStartTime, 
			testLogMessages;
			qunit = qunit || window.QUnit;

		// A helper to provide nice error messages
		//
		// Details param is the callback object from QUnit's log event
		// which is fired for each assertion
		var formatError = function(details) {
			var message = details.message;

			if (details.result) {
				return message;
			}

			if (details.expected) {
				message += " (Expected: " + details.expected + ", Actual: "	+ details.actual + ")";
			}

			if (details.source) {
				var cleanStack,
					stack,
					index = 0,
					length;

				cleanStack = [];
				stack = details.source;

				stack = stack.split(/\n/g);
				length = stack.length;
				for(; index < length; index++){
					line = stack[index];
					if(~line.indexOf('/qunit.js'))	continue;

					// Remove the proxy junk
					line = line.replace(/\(.*\/g\/.*?\//,'(');
					
					// Remove the socket id from the main page
					line = line.replace(/\?queenSocketId=([\w-])*/,'');

					cleanStack.push(line);
				}

				// remove mocha stack entries
				message += "\n" + cleanStack.join('\n');
			}

			return message;
		};

		// When test suite begins
		qunit.begin(function(){
			socket([MESSAGE_TYPE["start"]]);
		});

		// When module starts
		qunit.moduleStart(function(details){
			socket([MESSAGE_TYPE["suite start"], {
				name: details.name
			}]);
		});

		// When a test block begins
		qunit.testStart(function(details) {
			socket([MESSAGE_TYPE["test start"], {
				name : details.name,
				suite : details.module
			}]);

			testStartTime = new Date().getTime();
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
			var timeElapsed = new Date().getTime() - testStartTime;
			
			socket([MESSAGE_TYPE["test end"], {
				name: details.name,
				suite: details.module,
				runtime: timeElapsed,
				passCount: details.passed,
				failCount: details.failed,
				log: testLogMessages.join('\n')
			}]);
		});

		// When a module ends
		qunit.moduleDone(function(details){
			socket([MESSAGE_TYPE["suite end"], {
				name: details.name,
				failCount: details.failed,
				passCount: details.passed,
				totalCount: details.total
			}]);
		});

		// When a test suite ends
		qunit.done(function(details) {
			socket([MESSAGE_TYPE["done"], {
				failCount: details.failed,
				passCount: details.passed,
				total: details.total,
				runtime: details.runtime,
				passed: details.failed === 0
			}]);
			
			// Clean up
			testCount = null;
			testStartTime = null;
			testLogMessages = null;
		});
	};

	var results = window.location.search.match(/(?:\?|\&)queenSocketId=(.*)(?:\&|$)/);
	if(!results){
		throw new Exception('Unable to find queen socket id in the url.');
	}
	var queenSocket = window.parent.iframeSockets[results[1]];
	
	adaptQUnitToThrill(QUnit, queenSocket);
}());
