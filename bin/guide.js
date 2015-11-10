#!/usr/bin/env node
var argv = require("yargs")
	.alias("b", "browser")
	.default("b", "firefox")
	.boolean("local")
	.default("local", false)
	.describe("app", "The name of the application")
	.describe("skip-to", "The initial step to skip to")
	.boolean("debug")
	.default("debug", false)
	.describe("debug", "Log debug information")
	.describe("root", "Root folder to begin in")
	.demand(1)
	.usage("Usage: $0 path/to/script.js")
	.argv;
var path = require("path");

var automate = require("../lib/guide-test")

automate.setDefaults({
	browser: argv.browser,
	local: argv.local,
	app: argv.app,
	initialStep: argv.skipTo,
	log: argv.debug
});

var scriptPth = path.resolve(argv._[0]);

if(argv.root) {
	process.chdir(argv.root);
}

require(scriptPth);
