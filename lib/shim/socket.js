(function(){
	var isNode = typeof process === "object" && {}.toString.call(process) === "[object process]";
	if(isNode) return;

	var ws;

	function connect() {
		var host = window.document.location.host.replace(/:.*/, '');
		var url = "ws://" + host + ":8171";
		ws = new WebSocket(url);

		ws.onopen = function(){
			ws.onmessage = receive;
			ws.send("ping");
		};

		ws.onerror = function(err){
			var msg = {
				type: "error",
				msg: "Websocket error: " + stringifyError(err)
			};
			ws.send(JSON.stringify(msg));
		};

		window.onerror = function(err){
			var msg = {
				type: "error",
				msg: stringifyError(err)
			};
			ws.send(JSON.stringify(msg));
		};

		var consoleError = console.error;
		console.error = function(/* errors */){
			var errors = [].slice.call(arguments).map(function(item){
				return ""+item;
			}).join("\n");

			var msg = {
				type: "error",
				msg: errors
			};
			ws.send(JSON.stringify(msg));
			return consoleError.apply(this, arguments);
		};

		return ws;
	}


	function amTesting() {
		return typeof MinUnit !== "undefined";
	}

	function receive(msg) {
		var cmd = JSON.parse(msg.data);
		logInfo("Running tests for", cmd.scripts && cmd.scripts.length);
		if(cmd.scripts) {
			injectScripts(cmd.scripts);
		}
	}

	function logInfo(/* msgs */){
		var args = [].slice.call(arguments);
		var msg = args.join(" ");
		ws.send(JSON.stringify({
			type: "info",
			msg: msg
		}));
	}

	function stringifyError(err) {
		return err.toString() + (err.stack && err.stack.toString());
	}

	function injectScripts(scripts){
		var injected = [];

		if(amTesting()) {
			MinUnit.reset();
		}

		var head = document.head;
		scripts.forEach(function(txt){
			var script = document.createElement("script");
			var tn = document.createTextNode(txt);
			script.appendChild(tn);
			head.appendChild(script);
			injected.push(script);
		});

		if(amTesting()) {
			MinUnit.done(function(results){
				ws.send(JSON.stringify({
					type: "test",
					results: results
				}));
				MinUnit.reset();
				injected.forEach(function(script){
					head.removeChild(script);
				});
			});
			MinUnit.load();
		} else if(scripts.length) {
			ws.send(JSON.stringify({
				type: "msg",
				msg: "MinUnit is not on the page."
			}));
		}
	}

	if(typeof steal !== "undefined") {
		steal.done()
		.then(connect)
		.then(null, function(err){
			connect();
			ws.addEventListener("open", function(){
				logInfo("Steal error", err);
			});
		});
	} else {
		connect();
	}

})();
