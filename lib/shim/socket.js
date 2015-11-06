(function(){
	var isNode = typeof process === "object" && {}.toString.call(process) === "[object process]";
	if(isNode) return;

	var ws = new WebSocket("ws://localhost:8171");

	ws.onopen = function(){
		ws.onmessage = cmd;
		ws.send("ping");
	};

	function amTesting() {
		return typeof MinUnit !== "undefined";
	}

	function receive(msg) {
		var cmd = JSON.parse(msg);
		if(cmd.scripts) {
			injectScripts(cmd.scripts);
		}
	}

	function injectScripts(scripts){
		// TODO remove the scripts later

		var head = document.head;
		scripts.forEach(function(txt){
			var script = document.createElement("script");
			var tn = document.createTextNode(txt);
			script.appendChild(tn);
			head.appendChild(script);
		});

		if(amTesting()) {
			MinUnit.done(function(results){
				ws.send({
					type: "test",
					results: results
				});
				MinUnit.reset();
			});
		}
	}

})();
