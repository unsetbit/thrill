var noop = exports.noop = function(){};

var each = exports.each = function(obj, func, context){
	var result, key;
	for(key in obj){
		if(obj.hasOwnProperty(key)){
			result = func.call(context, obj[key], key, obj);
			if(result !== void 0) return result;
		}
	}
};

var filter = exports.filter = function(obj, func, context){
	var results = [];

	each(obj, function(value, key){
		if(func.call(context, value, key, obj)) results.push(value);
	});

	return results;
};

var values = exports.values = function(obj){
	var results = [];
	each(obj, function(value){ results.push(value); });
	return results;
};

// From underscore: https://github.com/documentcloud/underscore
var once = exports.once = function(func){
	var ran = false, result;
	return function(){
		if(ran) return result;
		ran = true;
		result = func.apply(this, arguments);
		func = null;
		return result;
	};
};