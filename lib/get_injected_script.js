var asap = require("pdenodeify");
var fs = require("fs");
var path = require("path");

var script;

module.exports = function(){
	if(script) {
		return script;
	}

	var pths = [
		// jquery
		require.resolve("jquery"),

		// funcunit
		path.join(require.resolve("funcunit"), "..", "..", "funcunit.js"),

		// minunit
		require.resolve("minunit"),

		// minunit funcunit adapter
		path.join(path.dirname(require.resolve("minunit")), "adapter.js"),

		// Web socket connect
		__dirname + "/shim/socket.js"

	].map(function(pth){
		return asap(fs.readFile)(pth, "utf8");
	});

	return Promise.all(pths).then(function(datas){
		script = Promise.resolve(datas.join(""));
		return script;
	});
};
