var asap = require("pdenodeify");
var fs = require("fs");
var debug = require("debug")("guide-automation:replace_json");

module.exports = function(dest, src, opts, replacer){
	debug("Replacing JSON", dest, src);

	if(typeof opts === "function") {
		replacer = opts;
		opts = undefined;
	}
	opts = opts || "utf8";

	var sourcePromise = asap(fs.readFile)(src, opts).then(JSON.parse);
	var destPromise = asap(fs.readFile)(dest, opts).then(JSON.parse);

	var updatePromise = Promise.all([
		sourcePromise,
		destPromise
	])
	.then(function(arr){
		var source = arr[0];
		var pkg = arr[1];

		Object.keys(source).forEach(function(key){
			var value = source[key];
			pkg[key] = value;
		});
		return pkg;
	});

	if(replacer) {
		updatePromise = updatePromise.then(replacer);
	}

	return updatePromise
		.then(JSON.stringify)
		.then(function(source){
			return asap(fs.writeFile)(dest, source, opts);
		});
};
