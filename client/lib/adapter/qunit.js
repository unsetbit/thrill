(function(env){
	var adaptQUnitToThrill = function(bullhorn, qunit) {
		var testStartTime, 
			testLogMessages;
			qunit = qunit || env.QUnit;
		
		// QUnit requires a specific div for some of it's testing magic
		var injectQUnitFixture = function() {
			var body = document.getElementsByTagName('body')[0],
				div;
			div = document.createElement('div');
			div.id = "qunit";
			body.appendChild(div);

			div = document.createElement('div');
			div.id = "qunit-fixture";
			body.appendChild(div);
		};
		injectQUnitFixture();


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
				message += "\nExpected: " + details.expected + ", Actual: "	+ details.actual;
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
			bullhorn.emit("start");
			bullhorn.emit("suiteStart");
		});

		// When module starts
		//qunit.moduleStart(function(){});

		// When a test block begins
		qunit.testStart(function(details) {
			bullhorn.emit("testStart", {
				name : details.name,
				suite : details.module,
			});

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
			
			bullhorn.emit("testEnd", {
				name: details.name,
				suite: details.module,
				runtime: timeElapsed,
				passed: details.passed,
				failed: details.failed,
				skipped: 0,
				log: testLogMessages.join('\n')
			});
		});

		// When a module ends
		// qunit.moduleDone(function(){});

		// When a test suite ends
		qunit.done(function(details) {
			bullhorn.emit("suiteEnd", {
				failed: details.failed,
				passed: details.passed,
				total: details.total,
				runtime: details.runtime
			});
			
			bullhorn.emit("end");
			
			// Clean up
			testCount = null;
			testStartTime = null;
			testLogMessages = null;
		});
	};

	adaptQUnitToThrill(env.bullhorn, env.QUnit);

// get at whatever the global object is, like window in browsers
}( (function() {return this;}.call()) ));
