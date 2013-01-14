var path = require('path'),
	fs = require('fs'),
	utils = require('../../lib/utils.js'),
	configDir = require('../../').configDir,
	ADAPTER_CONFIG_FILEPATH = configDir + '/adapters.json',
	adapterConfig = require(ADAPTER_CONFIG_FILEPATH);

module.exports = function(action){
	startThrill = false;

	var args = Array.prototype.slice.call(arguments, 0);
	
	args.shift();
	app = args.pop();

	switch(action){
		case "set":
			set.apply(void 0, args);
			break;
		case "remove":
			remove.apply(void 0, args);	
			break;
		default:
			list();
	}
}

function list(){
	console.log("List of thrill adapters for libraries: ");
	utils.each(adapterConfig, function(filePath, library){
		console.log(library + "\t: "+ filePath);
	});
};

function set(name, filePath){
	if(filePath[0] === '.'){
		filePath = path.resolve(filePath);	
	} 

	var valid = false;
	try { // Check to see if it's a module that can be required in
		valid = require(filePath);
	} catch(e){
		// Regular js file
		valid = fs.existsSync(filePath);
	}

	if(!valid) return console.log('Unable to set "' + name + '" adapter to ' + filePath + '. \nFile doesn\'t exist. If this was a npm package, make sure it\'s installed globally');

	if(name in commandHandlerConfig){
		console.log('Removing "' + name + '" adapter (' + commandHandlerConfig[name] + ')');
	}

	console.log('Setting "' + name + '" adapter to ' + filePath);	
	commandHandlerConfig[name] = filePath;
	fs.writeFileSync(ADAPTER_CONFIG_FILEPATH, JSON.stringify(commandHandlerConfig));
}

function remove(name){
	if(!(name in commandHandlerConfig)) return console.log('Unable to remove "' + name + '" adapter because it doesn\'t exist.');
	var filePath = commandHandlerConfig[name];

	console.log('Removing "' + name + '" adapter (' + filePath + ')');
	delete commandHandlerConfig[name];
	fs.writeFileSync(ADAPTER_CONFIG_FILEPATH, JSON.stringify(commandHandlerConfig));	
}