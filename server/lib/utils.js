exports.logEvents = logEvents = function(logger, obj, prefix, eventsToLog){
	var loggingFunctions = [];
	prefix = prefix || "";

	eventsToLog.forEach(function(eventToLog){
		var level = eventToLog[0],
			event = eventToLog[1],
			message = prefix + eventToLog[2],
			loggingFunction = function(){
				logger[level](message);
			}

		loggingFunctions.push([event, loggingFunction]); 
		obj.on(event, loggingFunction);
	});
	return loggingFunctions;
};

exports.stopLoggingEvents = stopLoggingEvents = function(obj, eventLoggingFunctions){
	eventLoggingFunctions.forEach(function(eventLoggingFunction){
		var event = eventLoggingFunction[0],
			func = eventLoggingFunction[1];

		obj.removeListener(event, func);
	});
};

// from http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
exports.getNetworkIPs = (function () {
    var ignoreRE = /^(127\.0\.0\.1|::1|fe80(:1)?::1(%.*)?)$/i;

    var exec = require('child_process').exec;
    var cached;
    var command;
    var filterRE;

    switch (process.platform) {
	    case 'win32':
	    //case 'win64': // TODO: test
	        command = 'ipconfig';
	        filterRE = /\bIP(v[46])?-?[^:\r\n]+:\s*([^\s]+)/g;
	        // TODO: find IPv6 RegEx
	        break;
	    case 'darwin':
	        command = 'ifconfig';
	        filterRE = /\binet\s+([^\s]+)/g;
	        // filterRE = /\binet6\s+([^\s]+)/g; // IPv6
	        break;
	    default:
	        command = 'ifconfig';
	        filterRE = /\binet\b[^:]+:\s*([^\s]+)/g;
	        // filterRE = /\binet6[^:]+:\s*([^\s]+)/g; // IPv6
	        break;
    }

    return function (callback, bypassCache) {
        if (cached && !bypassCache) {
            callback(null, cached);
            return;
        }
        // system call
        exec(command, function (error, stdout, sterr) {
            cached = [];
            var ip;
            var matches = stdout.match(filterRE) || [];
            //if (!error) {
            for (var i = 0; i < matches.length; i++) {
                ip = matches[i].replace(filterRE, '$1')
                if (!ignoreRE.test(ip)) {
                    cached.push(ip);
                }
            }
            //}
            callback(error, cached);
        });
    };
})();
