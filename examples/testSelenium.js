var webdriverjs = require("webdriverjs");
var createThrill = require('./server/thrill.js').create;

var loggerDefaults = require("../minion-master/server/src/logger.js").defaults;
loggerDefaults.threshold = 0;

emptyFunc = function(){};

exports.create = create = function(){
	var thrill = createThrill({port:80});
	var seleniumThrillRunner = new SeleniumThrillRunner(thrill, ["firefox"], "http://localhost/minion-master/capture.html");
	return seleniumThrillRunner;
};

exports.SeleniumThrillRunner = SeleniumThrillRunner = function(thrill, browsers, captureUrl){
	this._browsers = browsers;
	this._thrill = thrill;
	this._captureUrl = captureUrl;
	this._drivers = [];
};

SeleniumThrillRunner.prototype.start = function(){
	var self = this;

	this._spawnBrowsers(function(){
		self._runTests(function(exitCode){
			self._killBrowsers(function(){
				process.exit(exitCode);
			});
		});
	});
};

SeleniumThrillRunner.prototype._spawnBrowsers = function(callback){
	var self = this,
		browsers = this._browsers,
		drivers = this._drivers;

	browsers.forEach(function(browser){
		var driver = webdriverjs.remote({logLevel:"silent", host:"localhost" ,desiredCapabilities:{browserName:browser}});
		var request = driver.init();
		drivers.push(driver);
	});
			
	var readyCount = 0;
	drivers.forEach(function(driver){
		driver.url(self._captureUrl).getTitle(function(result){
			readyCount++;
		});
	});

	(function waitForBrowsers(){
		if(readyCount !== drivers.length){
			return process.nextTick(waitForBrowsers);
		}

		callback();
	}())
};

SeleniumThrillRunner.prototype._runTests = function(callback){
	callback = callback || emptyFunc;
	var self = this;

	this._thrill.on("clientConnected", function(client){
		self._thrill.runLocalOnce([
			'http://code.jquery.com/jquery-1.8.1.js',
			'client/lib/qunit.js',
			'client/adapter/qunit.js',
			'client/test1.js'
		], function(results){
			if(results.passed === true){
				callback(0);	
			} else {
				callback(1);	
			}
		});
	});
};

SeleniumThrillRunner.prototype._killBrowsers = function(callback){
	callback = callback || emptyFunc;
	var self = this,
		drivers = this._drivers;

	var killedCount = 0;
	drivers.forEach(function(driver){
		driver.end(function(){
			killedCount++;
		});
	});

	(function waitForBrowsers(){
		if(killedCount !== drivers.length){
			return process.nextTick(waitForBrowsers);
		}

		callback();
	}());
};

var testRunner = create();
testRunner.start();