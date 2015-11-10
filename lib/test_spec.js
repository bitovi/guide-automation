var chalk = require("chalk");

var check = "✔";
var ecks = "✖";

var space = function(len){
	var str = "";
	while(len > 0) {
		str += " ";
		len--;
	}
	return str;
};

//
exports = module.exports = function(tests){
	var modules = tests.results;
	modules.forEach(function(mod){
		console.log(space(2), chalk.bold(mod["module"]));
		console.log(space(0)); // an empty line
		mod.results.forEach(function(test){
			console.log(space(2), chalk.underline(test.name));
			test.results.filter(function(assertion){
				return !!assertion.message;
			}).forEach(function(assertion){
				var mark = assertion.assertion
					? chalk.green(check)
					: chalk.red(ecks);
				console.log(space(4), mark, assertion.message);
			});
			console.log(space(0));
		});
	});
};
