var swift = require("./swift");

var mp = new swift.MessageParser();
var bp = new swift.BlockParser();

var messages = [];
var current = {};
var currfield = null;

bp.onHeader = function(header) {
	current.headers.push(header);
	console.log("onHeader: " + JSON.stringify(header));
}

bp.onTrailer = function(trailer) {
	current.trailers.push(trailer);
	console.log("onTrailer: " + JSON.stringify(trailer));
}

bp.onField = function(field) {
	console.log("onField: " + JSON.stringify(field));
	if("tag" in field) {
		current.body.push(field);
		currfield = field;
	}
	else {
		currfield.value += "\r\n" + field.value;
	}
}

bp.onBodyStart = function() {
	console.log("onBodyStart");
}

bp.onBodyEnd = function() {
	console.log("onBodyEnd");
	messages.push(current);
}

mp.onBlock = function(type, buffer) {
	if(type == 1) {
		current = {
			headers: [],
			body: [],
			trailers: []
		};
		console.log("");
	}
	console.log("onBlock: " + type);
	bp.Parse(type, buffer.toString("utf8"));
}

var b = require("fs").readFileSync(process.ARGV[2]);
var len = b.length;
var start = 0;
var blocksize = 1000;
while(true) {
	var end = start + (blocksize>len?len:blocksize);
	mp.Parse(b.slice(start,end));
	var parsed = (end - start);
	len -= parsed;
	start += parsed;
	if(len <= 0) break;
}
console.log(JSON.stringify(messages, null, "\t"));