(function(){
	var MESSAGE_TYPE = {
		"start": 1, // [1]
		"done": 2, // [2, PASSED]
		"suite start": 3, // [3]
		"suite end": 4, // [4]
		"test start": 5, // [5]
		"test end": 6 // [6]
	};

	function adaptMochaToThrill(mocha, socket){
		var formatError = function(error) {
			var stack = error.stack,
				firstLine,
				cleanStack,
				message = error.message,
				line,
				firstLine,
				index = 0,
				length;

			if (stack) {
				cleanStack = [];
				firstLine = stack.substring(0, stack.indexOf('\n'));
				if (message && firstLine.indexOf(message) === -1) {
					stack = message + '\n' + stack;
				}
				
				stack = stack.split(/\n/g);
				length = stack.length;
				for(; index < length; index++){
					line = stack[index];
					if(~line.indexOf('/mocha.js'))	continue;

					// Remove the proxy junk
					line = line.replace(/\(.*\/g\/.*?\//,'(');
					
					// Remove the socket id from the main page
					line = line.replace(/\?queenSocketId=([\w-])*/,'');

					cleanStack.push(line);
				}
				// remove mocha stack entries
				return cleanStack.join('\n');
			}

			return message;
		};

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
			return suite.tests.filter(function(test){
				return test.state === state;
			});
		}

		function reporter(runner){
			runner.on('start', function(){
				console.log('start');
				socket([MESSAGE_TYPE["start"]]);
			});

			runner.on('suite', function(suite){
				console.log('suite', suite);
				socket([MESSAGE_TYPE["suite start"], {
					name: getSuiteName(suite)
				}]);
			});
			
			runner.on('test', function(test){
				console.log('test', test);
				
				test.$errors = [];
				
				socket([MESSAGE_TYPE["test start"], {
					name : test.title,
					suite : getSuiteName(test.parent)
				}]);
			});

			runner.on('fail', function(test, error) {
		      if (test.type === 'hook' || error.uncaught) {
		        test.$errors = [formatError(error)];
		      } else {
		        test.$errors.push(formatError(error));
		      }
		    });

			runner.on('test end', function(test){
				console.log('test end', test);
				var passed = test.state === "passed";

				socket([MESSAGE_TYPE["test end"], {
					name: test.title,
					suite: getSuiteName(test.parent),
					runtime: test.timer,
					passCount: passed? 1 : 0,
					failCount: passed? 0 : 1,
					log: test.$errors.join('\n')
				}]);
			});

			runner.on('suite end', function(suite){
				console.log('suite end', suite);
				var failCount = getTestsWithState("failed", suite).length,
					passCount = getTestsWithState("passed", suite).length;

				socket([MESSAGE_TYPE["suite end"], {
					name: getSuiteName(suite),
					failCount: failCount,
					passCount: passCount,
					totalCount: suite.tests.length
				}]);
			});

			runner.on('end', function(end){
				console.log('end');
				
				socket([MESSAGE_TYPE["done"], {}]);
			});
		}

		mocha.setup({reporter: reporter, ui: 'bdd'});
	}
	
	var results = window.location.search.match(/(?:\?|\&)queenSocketId=(.*)(?:\&|$)/);
	if(!results){
		throw new Exception('Unable to find queen socket id in the url.');
	}
	var queenSocket = window.parent.iframeSockets[results[1]];
	adaptMochaToThrill(mocha, queenSocket);
}());

