var asap = require("pdenodeify");
var fs = require("fs");

module.exports = function(dest, src, opts, replacer){
	opts = opts || "utf8";
	return asap(fs.readFile)(src, opts).then(function(source){
		if(replacer) {
			source = replacer(source);
		}

		return asap(fs.writeFile)(dest, source, opts);
	});
}
