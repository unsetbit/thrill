var MESSAGE_TYPE = {
	"start": 1, // [1]
	"done": 2, // [2, PASSED]
	"suite start": 3, // [3]
	"suite end": 4, // [4]
	"test start": 5, // [5]
	"test end": 6 // [6]
};

var queenSocket = (function(){
	var results = window.location.search.match(/(?:\?|\&)queenSocketId=(.*)(?:\&|$)/);
	if(!results) throw new Exception('Unable to find queen socket id in the url.');
	return window.parent.iframeSockets[results[1]];
}());
