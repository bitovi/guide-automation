var asap = require("pdenodeify");
var fs = require("fs");

module.exports = function(dest, src, opts){
	opts = opts || "utf8";
	return asap(fs.readFile)(src, opts).then(function(source){
		return asap(fs.writeFile)(dest, source, opts);
	});
}
