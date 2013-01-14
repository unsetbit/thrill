// This command allows the user to type "thrill command [COMMAND NAME] [FILE PATH OR MODULE NAME]"
// in order to set thrill commands to their liking.

var path = require('path'),
	fs = require('fs'),
	configDir = require('../../').configDir,
	commandHandlerConfig = require(configDir + '/commands.json');

module.exports = function(action){
	startThrill = false;

	var args = Array.prototype.slice.call(arguments, 0);
	
	args.shift();
	app = args.pop();

	if(action === "set"){
		set.apply(void 0, args);
	}

	if(action === "remove"){
		remove.apply(void 0, args);	
	}
}

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

	if(!valid) return console.log('Unable to set command "' + name + '" to ' + filePath + '. \nFile doesn\'t exist. If this was a npm package, make sure it\'s installed globally');

	if(name in commandHandlerConfig){
		console.log('Removing command "' + name + '" pointing to ' + commandHandlerConfig[name]);
	}

	console.log('Setting command "' + name + '" pointing to ' + filePath);	
	commandHandlerConfig[name] = filePath;
	fs.writeFileSync(configDir + '/commands.json', JSON.stringify(commandHandlerConfig));
}

function remove(name){
	if(!(name in commandHandlerConfig)) return console.log('Unable to remove command "' + name + '" because it doesn\'t exist.');
	var filePath = commandHandlerConfig[name];

	console.log('Removing command "' + name + '" pointing to ' + filePath);
	delete commandHandlerConfig[name];
	fs.writeFileSync(configDir + '/commands.json', JSON.stringify(commandHandlerConfig));	
}