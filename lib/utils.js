var noop = exports.noop = function(){};

function forEachInArray(arr, func, context){
	var index = 0,
		length = arr.length;

	for(; index < length; index++){
		func.call(context, arr[index], index, arr);
	}
}

function forEachInObject(obj, func, context){
	var key;
	for(key in obj){
		if(obj.hasOwnProperty(key)){
			func.call(context, obj[key], key, obj);
		}
	}
}

var each = exports.each = function(obj, func, context){
	if(obj instanceof Array){
		return forEachInArray.apply(void 0, arguments);	
	} else {
		return forEachInObject.apply(void 0, arguments);	
	}
};

function mapArray(arr, func, context){
	var index = 0,
		length = arr.length,
		result = [];

	for(; index < length; index++){
		result.push(func.call(context, arr[index], index, arr));
	}

	return result;
}

function mapObject(obj, func, context){
	var key, 
		result = {};

	for(key in obj){
		if(obj.hasOwnProperty(key)){
			result[key] = func.call(context, obj[key], key, obj);
		}
	}

	return result;
}

var map = exports.map = function(obj, func, context){
	if(obj instanceof Array){
		return mapArray.apply(void 0, arguments);	
	} else {
		return mapObject.apply(void 0, arguments);	
	}
};

function filterArray(arr, func, context){
	var index = 0,
		length = arr.length,
		result = [];

	for(; index < length; index++){
		if(func.call(context, arr[index], index, arr)){
			result.push(arr[index]);
		}
	}

	return result;
}

function filterObject(obj, func, context){
	var key, 
		result = {};

	for(key in obj){
		if(obj.hasOwnProperty(key)){
			if(func.call(context, obj[key], key, obj)){
				result[key] = obj[key];
			}
		}
	}
	
	return result;
}

var filter = exports.filter = function(obj, func, context){
	if(obj instanceof Array){
		return filterArray.apply(void 0, arguments);	
	} else {
		return filterObject.apply(void 0, arguments);	
	}
};

var values = exports.values = function(obj){
	var results = [];
	forEachInObject(obj, function(value){ results.push(value); });
	return results;
};

var keys = exports.keys = function(obj){
	var results = [];
	forEachInObject(obj, function(value, key){ results.push(key); });
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