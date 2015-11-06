#!/usr/bin/env node
var argv = require("yargs")
	.alias("b", "browser")
	.default("b", "firefox")
	.boolean("local")
	.default("local", false)
	.demand(1)
	.usage("Usage: $0 path/to/script.js")
	.argv;
var path = require("path");

var automate = require("../lib/guide-test")
automate.setDefaults({
	browser: argv.browser,
	local: argv.local
});

var scriptPth = path.resolve(argv._[0]);
require(scriptPth);
