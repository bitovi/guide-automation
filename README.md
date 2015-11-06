# guide-automation

A helper library for writing scripts to run through guides. Allows you to build an application and test it along the way.

## Install

```
npm install guide-automation
```

## Usage

**guide-automation** consists of helpers for testing parts of guides, as well as a queue to make sure tests are written in order. A typical usage looks like:

```js
var guide = require("guide-automation")();

guide.step("Install donejs", function(){
	return guide.runCommand("npm", "install donejs -g".split(" "));
});

guide.step("Start donejs develop", function(){
	process.chdir("donejs-chat");
	var child = this.canServe = guide.executeCommand("donejs", ["develop"]).childProcess;

	var server = streamWhen(child.stdout, /can-serve starting on/);
	var liveReload = streamWhen(child.stderr, /Live-reload server/);
	return Promise.all([server, liveReload]);
});

guide.test(function(){
	return guide.nodeTest(__dirname + "/steps/3-donejs-develop/test.js");
});
```

## API

## License

MIT
