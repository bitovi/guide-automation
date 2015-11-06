var spawn = require("cross-spawn-async");
var promisify = require("promise-child");

module.exports = function(log){
	return function(cmd, args, options){
		options = options || {};
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
