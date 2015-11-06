var oneAtATime = require("promise-one-at-a-time");
var elegantSpinner = require("elegant-spinner");
var logUpdate = require("log-update");
var tmp = require("tmp");
var asap = require("pdenodeify");

module.exports = function(opts){
	opts = opts || {};
	var gt = {};

	var stack = [];
	var stepNumber = 0;
	var spinner = opts.spinner;
	var indexPath;

	// This is nasty
	if(opts.log) {
		opts.log = true;
		spinner = false;
	}

	// Execute a command
	gt.executeCommand = require("./execute_command")(opts.log);
	// Replace a file
	gt.replaceFile = require("./replace_file");

	gt.answerPrompts = function(cmd, args, options){
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
		stack.push({ desc: name, fn: callback, step: stepNumber });
	};

	gt.test = function(callback){
		stack.push({ fn: callback, isTest: true });
	};

	gt.indexPage = function(localPath){
		indexPath = localPath;
	};

	gt.launchBrowser = function(browser, url){
		if(!url) {
			throw new Error("Much provide a url to launch");
		}

		var fn = function(){
			var launch = require("launchpad");

			return asap(launch.local)().then(function(local){
				return asap(local[browser])(url);
			}).then(function(instance){
				gt.browser = instance;
			});
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
		stack.push({ desc: desc, fn: fn });
	};

	gt.run = function(){
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

	gt.nodeTest = function(testScript){
		return gt.executeCommand("mocha", [testScript], { stdio: "inherit" });
	};

	return gt;
};
