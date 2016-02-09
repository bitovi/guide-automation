(function(){
	var isNode = typeof process === "object" && {}.toString.call(process) === "[object process]";
	if(isNode) return;

	var host = window.document.location.host.replace(/:.*/, '');
	var url = "ws://" + host + ":8171";
	var ws = new WebSocket(url);

	ws.onopen = function(){
		ws.onmessage = receive;
		ws.send("ping");
	};

	ws.onerror = function(err){
		//alert("Oops" + err.toString())
	};

	function amTesting() {
		return typeof MinUnit !== "undefined";
	}

	function receive(msg) {
		var cmd = JSON.parse(msg.data);
		if(cmd.scripts) {
			injectScripts(cmd.scripts);
		}
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
		}
	}

})();
