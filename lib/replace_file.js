var asap = require("pdenodeify");
var fs = require("fs");
var debug = require("debug")("guide-automation:replace_file");

module.exports = function(dest, src, opts, replacer){
	opts = opts || "utf8";

	debug("Replacing file", src, dest);

	return asap(fs.readFile)(src, opts).then(function(source){
		if(replacer) {
			source = replacer(source);
		}

		return asap(fs.writeFile)(dest, source, opts);
	});
};
