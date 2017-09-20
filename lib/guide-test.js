var oneAtATime = require("promise-one-at-a-time");
var elegantSpinner = require("elegant-spinner");
var logUpdate = require("log-update");
var tmp = require("tmp");
var asap = require("pdenodeify");
var fs = require("fs");
var path = require("path");
var os = require("os");
var debug = require("debug")("guide-automation:guide-test");
var debugStd = require("debug")("guide-automation:guide-test:std");
var spawn = require("cross-spawn-async");
var promisify = require("promise-child");
var kill = require("tree-kill");
var isWindows = process.platform === "win32";

var globalOptions = {};

exports = module.exports = function(opts){
	opts = opts || {};
	Object.keys(globalOptions).forEach(function(key){
		if(!opts[key]) opts[key] = globalOptions[key];
	});

	// Namespace for guide automation stuff
	var gt = {};

	var stack = [];
	var stepNumber = 0;
	var spinner = opts.spinner;
	var webSocketReady;

	// This is nasty
	if(opts.log) {
		opts.log = true;
		spinner = false;
	}

	gt.options = opts;

	// Execute a command
	gt.executeCommand = gt.runCommand = require("./execute_command")(opts.log);
	// Replace a file
	gt.replaceFile = require("./replace_file");

	gt.answerPrompts = function(cmd, args, options){
		debug("Answer prompts for", cmd);

		var answerPrompts = require("answer-prompt");
		var promise = gt.executeCommand(cmd, args, options);
		var child = promise.childProcess;

		var answer = answerPrompts(child);

		return {
			promise: promise,
			answer: answer
		};
	};

	gt.step = function(name, callback){
		stepNumber++;

		debug("Pushing step", stepNumber, name);

		stack.push({ desc: name, fn: callback, step: stepNumber });
	};

	gt.stepIf = function(name, condition, callback) {
		gt.step(name, function() {
			if(condition.call(this)) {
				return callback.apply(this, arguments);
			} else {
				console.log("Not running conditional step `" + name + "`");
				return Promise.resolve(null);
			}
		});
	};

	gt.test = function(callback){
		stack.push({ fn: callback, isTest: true });
	};

	gt.ensureSpyServerRunning = function(){
		if(webSocketReady) return webSocketReady;

		gt.websocket = require("./testing_server")();
		webSocketReady = gt.websocket.ready;
		return webSocketReady;
	};

	// Inject a spy into an html-like file
	gt.injectSpy = function(pth){
		var parentFolder = path.dirname(pth);
		var getInjectedScript = require("./get_injected_script");

		// Start the web socket server.
		return gt.ensureSpyServerRunning().then(function(){
			// Inject FuncUnit, MinUnit, MinUnit Adapter
			return getInjectedScript();
		}).then(function(scriptText){
			return asap(fs.writeFile)(path.join(parentFolder, "__injector.js"),
												scriptText, "utf8");

		}).then(function(){
			return asap(fs.readFile)(pth, "utf8").then(function(html){
				// If the injector has already been added
				if(html.indexOf("__injector.js") > 0) {
					return Promise.resolve();
				}

				var scr = "<script src=\"/src/__injector.js\"></script>";
				if(html.indexOf("</body>") !== -1) {
					html = html.replace("</body>", scr + "</body>");
				} else {
					// If there is no body like on demo/test pages
					html = html + scr;
				}

				return asap(fs.writeFile)(pth, html, "utf8");
			});
		});
	};

	gt.openBrowser = function(browser, url){
		if(!url && browser.indexOf("http") === 0) {
			url = browser;
			browser = opts.browser;
		}
		if(!url) {
			throw new Error("Must provide a url to launch");
		}
		if(!browser) {
			throw new Error("Must provide a browser to run in");
		}

		var launch = require("launchpad");

		return asap(launch.local)().then(function(local){
			return asap(local[browser])(url);
		}).then(function(instance){
			instance.on("stop", function(data){
				console.log("Browser", browser, "stopped", data);
			});

			instance.stdout.on("data", function(data){
				debugStd("stdout: " + data.toString());
			});

			instance.stderr.on("data", function(data){
				debugStd("stderr: " + data.toString());
			});

			return gt.wait(5000).then(function(){
				return instance;
			});
		});
	};

	gt.launchBrowser = function(browser, url){
		if(!url && browser.indexOf("http") === 0) {
			url = browser;
			browser = opts.browser;
		}

		var fn = function(){
			console.log("Launching browser", browser, url);
			return gt.ensureSpyServerRunning().then(function(){
				return gt.openBrowser(browser, url);
			}).then(function(instance){
				gt.browser = instance;
			}).then(function(){
				return gt.wait(5000);
			});
		};
		stack.push({ fn: fn });
	};

	gt.closeBrowser = function(){
		var fn = function(){
			gt.browser.stop(function(){});
			gt.browser = undefined;
		};
		stack.push({ fn: fn });
	};

	gt.moveToTmp = function(){
		var fn = function(){
			gt._cwd = process.cwd();
			return asap(tmp.dir)().then(function(pth, cleanup){
				gt.cleanup = cleanup;
				gt.pth = pth;
				process.chdir(pth);
				console.log("Created tmp folder", pth);
			});
		};
		var desc = "Moving to temporary folder for testing";
		if(!opts.local) {
			stack.push({ desc: desc, fn: fn });
		}
	};

	gt.run = function(){
		if(opts.initialStep) {
			gt.skipTo(opts.initialStep);
		}

		var fns = stack.map(function(action, index){
			return function(){
				if(action.step && action.desc) {
					console.log("Step " + action.step +":", action.desc);
				} else if(action.desc) {
					console.log(action.desc);
				}
				var promise = Promise.resolve(action.fn());
				if(!action.isTest) {
					gt.startSpinner();
				} else {
					promise.then(null, function(err){
						console.log("Failed with an error of", err.message, err.stack);
					});
				}
				var stopSpinner = gt.stopSpinner.bind(gt);
				promise.then(stopSpinner, stopSpinner);
				return promise;
			};
		});

		var runPromise = oneAtATime(fns);
		runPromise.then(gt.endRun, gt.endRun);
		return runPromise;
	};

	gt.startSpinner = function(){
		if(!spinner) return;
		var frame = elegantSpinner();
		gt._spinnerId = setInterval(function (){
			logUpdate(frame());
		}, 50);
	};

	gt.stopSpinner = function(){
		if(gt._spinnerId) {
			clearInterval(gt._spinnerId);
			logUpdate.clear();
			gt._spinnerId = undefined;
		}
	};

	gt.endRun = function(){
		if(gt._cwd) {
			process.chdir(gt._cwd);
		}
		if(gt.cleanup) {
			gt.cleanup();
		}
	};

	gt.skipTo = function(step){
		debug("Skipping to step", step);

		var i = 0,
			len = stack.length, action;
		for(;i < len; i++) {
			action = stack[i];
			if(action.step == step) {
				break;
			}
		}
		stack.splice(0, i);
	};

	/**
	 * Wait a little while
	 */
	gt.wait = function(ms){
		debug("Waiting ", ms, "ms");
		return new Promise(function(resolve){
			setTimeout(resolve, ms);
		});
	};

	gt.nodeTest = function(testScript){
		var current = process.cwd();
		var mochaBinary = os.platform() === "win32" ? "mocha.cmd" : "mocha";
		var mochaPath;

		while(!fs.existsSync(mochaPath = path.join(current, "node_modules", ".bin", mochaBinary)) &&
				current !== path.join(current, "..")) {
			current = path.join(current, "..");
		}

		debug('Running mocha test', mochaPath, testScript);

		return gt.executeCommand(mochaPath, [testScript], { stdio: "inherit" });
	};

	gt.functionalTest = function(testPth){
		console.log("Running functional tests.");
		return asap(fs.readFile)(testPth, "utf8").then(function(testScript){
			testScript = "(function(){\n" + testScript + "\n})();";
			debug("fuctionalTest: loaded script from " + testPth);
			return gt.websocket.runTest(testScript);
		}).then(function(result){
			debug("functionalTest: got result from test server");
			if(result.type === "test") {
				var testSpec = require("./test_spec");
				testSpec(result);
			} else {
				console.log("Message from browser:", result);
			}
		});
	};

	gt.replaceJson = require("./replace_json");

	gt.kill = function(childProcess){
		var pid = childProcess.pid;
		console.log("Killing", pid);

		return new Promise(function(resolve){
			kill(pid, undefined, function(){
				resolve();
			});
		});
	};

	return gt;
};

exports.setDefaults = function(opts){
	for(var p in opts) {
		globalOptions[p] = opts[p];
	}
};
