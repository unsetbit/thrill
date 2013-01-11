(function(env){
	var MESSAGE_TYPE = {
		"start": 1, // [1]
		"done": 2, // [2, PASSED]
		"suite start": 3, // [3]
		"suite end": 4, // [4]
		"test start": 5, // [5]
		"test end": 6 // [6]
	};

	var adaptQUnitToThrill = function(socket, qunit) {
		var testStartTime, 
			testLogMessages;
			qunit = qunit || env.QUnit;

		// A helper to provide nice error messages
		//
		// Details param is the callback object from QUnit's log event
		// which is fired for each assertion
		var formatFailMessage = function(details) {
			var message = details.message, trace;

			if (details.result) {
				return message;
			}

			if (details.expected) {
				message += " (Expected: " + details.expected + ", Actual: "	+ details.actual + ")";
			}

			if (details.source) {
				trace = details.source;

				// Remove qunit.js calls
				trace = trace.replace(/\n.+qunit\.js\?\d*\:.+(?=(\n|$))/g, '');

				message += "\n" + trace;
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
				testLogMessages.push(formatFailMessage(details));
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

	var getParam = function(name){
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regexS = "[\\?&]" + name + "=([^&#]*)";
		var regex = new RegExp(regexS);
		var results = regex.exec(window.location.search);
		if(results == null)	return "";
		else return decodeURIComponent(results[1].replace(/\+/g, " "));
	}
	var queenSocket = window.parent.iframeSockets[getParam("queenSocketId")];
	
	adaptQUnitToThrill(queenSocket, env.QUnit);

// get at whatever the global object is, like window in browsers
}( (function() {return this;}.call()) ));
