var spawn = require("cross-spawn-async");
var promisify = require("promise-child");
var debug = require("debug")("guide-automation:execute_command");

module.exports = function(log){
	return function(cmd, args, options){
		options = options || {};

		debug("Running command", cmd, args, options);

		var child = spawn(cmd, args, options);

		if(log && options.stdio !== "inherit") {
			child.stdout.pipe(process.stdout);
			child.stderr.pipe(process.stderr);
		}

		var promise = promisify(child);
		promise.childProcess = child;
		return promise;
	};
};
