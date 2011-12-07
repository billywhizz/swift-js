var swift = require("./swift");

var mp = new swift.MessageParser();
var bp = new swift.BlockParser();

var messages = 0;
var dummy = 0;

bp.onHeader = function(header) {
	dummy++;
}

bp.onTrailer = function(trailer) {
	dummy++;
}

bp.onField = function(field) {
	dummy++;
}

bp.onBodyStart = function() {
	dummy++;
}

bp.onBodyEnd = function() {
	messages++;
}

mp.onBlock = function(type, buffer) {
	bp.Parse(type, buffer.toString("utf8"));
}

var b = require("fs").readFileSync(process.argv[2]);
var runs = parseInt(process.argv[3] || 1);
var start = new Date().getTime();
while(runs--) {
	mp.Parse(b);
}
var end = new Date().getTime();
console.log(end - start, messages, (messages/((end-start)/1000)).toFixed(2));
