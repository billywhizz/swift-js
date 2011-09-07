var _state = {
	NONE: 0,
	HEADER: 1,
	MSGID: 2,
	BODY: 3
}
function BlockParser(options) {
	var rx1 = /(\w{1})([\w\d]{2})([\w\d]{12})(\d{4})(\d{6})/;
	var rxFinAddr = /([\d\w]{8})([\d\w])([\d\w]{3})/;
	var rx2I = /I(\d{3})([\w\d]{12})(\w{1})(\d{1})?(\d{3})?/;
	var rx2O = /O(\d{3})(\d{4})(\d{6})([\d\w]{12})(\d{4})(\d{6})(\d{6})(\d{4})(\w)/;
	var rxField = /:(\d\d)(\w)?:(.+)/;
	var rxGenericField = new RegExp(":(\\w{0,4})?/(\\w{0,8})?/(.+)?");
	var rxSubBlock = new RegExp("\\{([\\w\\d ]+):([\\w\\d ]+)\\}", "g");
	this.onHeader = null;
	this.onField = null;
	this.Parse = function(mtype, body) {
		var blocktype = parseInt(mtype);
		switch(blocktype) {
			case 1:
				var m = rx1.exec(body);
				if (m != null && m.length > 4) {
					var mm = rxFinAddr.exec(m[3]);
					if(this.onHeader) this.onHeader({
						block: blocktype,
						id: m[1],
						service: m[2],
						sender: {
							address: m[3],
							bic: mm[1],
							terminal: mm[2],
							branch: mm[3]
						},
						session: m[4],
						sequence: m[5]
					});
				}
				break;
			case 2:
				switch(body[0]) {
					case "I":
						var m = rx2I.exec(body);
						if (m != null && m.length > 4) {
							var mm = rxFinAddr.exec(m[2]);
							if(this.onHeader) this.onHeader({
								block: blocktype,
								type: m[1],
								direction: "I",
								receiver: {
									address: m[2],
									bic: mm[1],
									terminal: mm[2],
									branch: mm[3]
								},
								priority: m[3],
								monitor: m[4],
								obsolescence: m[5]
							});
						}
						break;
					case "O":
						var m = rx2O.exec(body);
						if (m != null && m.length > 8) {
							var mm = rxFinAddr.exec(m[4]);
							if(this.onHeader) this.onHeader({
								block: blocktype,
								type: m[1],
								inputtime: m[2],
								inputdate: m[3],
								direction: "O",
								sender: {
									address: m[4],
									bic: mm[1],
									terminal: mm[2],
									branch: mm[3]
								},
								session: m[5],
								sequence: m[6],
								outputdate: m[7],
								outputtime: m[8],
								priority: m[9]
							});
						}
						break;
				}
				break;
			case 4:
				if(this.onBodyStart) this.onBodyStart();
				var lines = body.split(/\r\n/);
				var len = lines.length;
				for(var i=0; i<len; i++) {
					var st = lines[i].trim();
					if(!(st == "" || st == "-")) {
						if(st[0] == ":") {
							var m = rxField.exec(st);
							if(m != null) {
								var val = m[3];
								if(val[0] == ":") {
									var mm = rxGenericField.exec(val);	
									if(this.onField) this.onField({
										tag: m[1],
										option: m[2],
										qualifier: mm[1],
										dss: mm[2],
										value: mm[3]
									});
								}
								else {
									if(this.onField) this.onField({
										tag: m[1],
										option: m[2],
										value: val
									});
								}
							}
						}
						else {
							if(this.onField) this.onField({
								value: st
							});
						}
					}
					else if(st == "-" && this.onBodyEnd) {
						this.onBodyEnd();
					}
				}
				break;
			case 3:
			case 5:
			default:
				var m = rxSubBlock.exec(body);
				var obj = {
					block: isNaN(blocktype)?mtype:blocktype
				};
				while(m != null && m.length > 1) {
					obj[m[1]] = m[2];
					m = rxSubBlock.exec(body);
				}
				if(isNaN(blocktype) || blocktype>4) {
					if(this.onTrailer) this.onTrailer(obj);
				}
				else {
					if(this.onHeader) this.onHeader(obj);
				}
				break;
		}
	}
}
function MessageParser(options) {
	var state = _state.NONE;
	var mtype = "0";
	var infield = false;
	var start = 0;
	var msgb = new Buffer(64 * 1024);
	this.onBlock = null;
	this.Reset = function() {
		start = 0;
		mtype = "0";
		state = _state.NONE;
		infield = false;
	}
	this.Parse = function(buffer) {
		var len = buffer.length;
		for(i=0;i<len;i++) {
			var c = buffer[i];
			switch(c)
			{
				case 123:
					if(state == _state.BODY) {
						msgb[start++] = c;
						infield = true;
					}
					else {
						state = _state.HEADER;
					}
					break;
				case 125:
					if((state == _state.BODY) && infield) {
						msgb[start++] = c;
						infield = false;
					}
					else {
						state = _state.NONE;
						if(this.onBlock) this.onBlock(mtype, msgb.slice(0, start));
						start = 0;
						mtype = "0";
					}
					break;
				default:
					if(infield) {
						msgb[start++] = c;
					}
					else {
						if(state == _state.HEADER) {
							mtype = String.fromCharCode(c);
							state = _state.MSGID;
						}
						else if(state == _state.MSGID && c == 58) {
							state = _state.BODY;
						}
						else if(state == _state.BODY) {
							msgb[start++] = c;
						}
					}
					break;
			}
		}
	}
}
exports.states = _state;
exports.BlockParser = BlockParser;
exports.MessageParser = MessageParser;