/* THE RUN FILE(S) */
run = [];
/* Use:
The run variable defines what the test runner will load.
This variable should either be an HTML file path, or a list
of script files.

Example of running an html file:
run = 'browser/index.html';
When running html files, you will likely need to serve other
resources the html file needs, you can do so with the 'serve'
variable below.

Example of running a list of scripts:
run = [
	'../lib/mocha.js',
	'../lib/adapter/thrill-mocha-adapter.js',
	'../test/myFirstTest.js',
	'../test/mySecondTest.js'
];
When you provide a list of scripts, thrill will automatically
generate an HTML file to load them in the order you defined. 
*/

/* LOCAL FILES TO SERVE */
serve = {};
/* Use:
You can either define a directory or a map of files/directories.
Anything you define in the "run" variable is automatically served, 
so you don't need to redefine them here.
To serve the "./test" directory as the "root", do this: 
serve = "./test"

To serve multiple paths, define a map where the keys are HTTP paths
relative to the root, and the values are files or directories:
serve = {
	'lib/mocha.js': '../lib/mocha.js',
	'lib/mocha.css': '../lib/mocha.css',
	'lib/mocha-adapter.js': '../../dist/thrill-mocha-adapter.js',
	'': './test'
};
*/

/* QUEEN HOST */
host = "";
/* Use:
This variable defines the host of the Queen server.
If you omit a hostname "localhost" will be used.
If you omit a port 9200 will be used.
*/

/* TEST TIMEOUT */
timeout = 2 * 60 * 1000; // 2 minutes
/* Use:
The timeout variable defines the milliseconds a browser has 
to complete running the tests until it's considered timedout.
*/

/* BROWSER FILTER */
filter = function(browser){
	/* Filtering by family */

	// Example: Exclude Chrome
	// if(browser.family === "Chrome"){ return false;}

	// Example: Exclude Browsers which don't have webworkers
	// if(!browser.capabilities.webworkers) return false;

	// Example: Exclude Browsers which don't have webworkers
	// if(!browser.capabilities.webworkers) return false;

	// Example: Only test on Android
	// if(!browser.os === "Android") return false;

	return true;
}
/* Use:
This acts to whitelist which browsers your test will run on.

For a full list of browser attributes you can filter on see the Thrill 
GitHub wiki.
*/


/* TESTING LIBRARY */
library = "mocha";
/* Use:
If you define a testing library, thrill will automatically prepend
it's copy to the list of run files. If you've defined an HTML
run file, Thrill will automatically add the nescessary adapter
when the HTML file is being served.

Supported values: mocha, qunit, jasmine
*/

/* LOGGING */
verbose = false;
quiet = false;
/* Use:
Setting verbose to true will output debug information to the console

Setting quiet to true will prevent anything from being output to
the console. This is useful in automated build processes where 
the only thing needed is a process exit code.
*/

/* HTTP HOST */
httpHost = ""; // will default to an [ip address]:9300
/* Use:
You usually won't need to change this variable.

This variable defines the host of the http server which will serve the test files.
By default (if undefined), Thrill will use your ip address and the port 9300.
*/