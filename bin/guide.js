#!/usr/bin/env node
var argv = require("yargs")
	.alias("b", "browser")
	.default("b", "firefox")
	.demand(1)
	.usage("Usage: $0 path/to/script.js")
	.argv;
var path = require("path");

global._guideAutomationOptions = {
	browser: argv.browser
};

var scriptPth = path.resolve(argv._[0]);
require(scriptPth);
