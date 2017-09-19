var debug = require("debug")("guide-automation:testing_server");

module.exports = function(port){
	port = port || 8171;
	var WebSocketServer = require("websocket").server;
	var http = require("http");

	var server = http.createServer(function(request, response) {
		response.writeHead(404);
		response.end();
	});
	var readyPromise = new Promise(function(resolve){
		server.listen(port, function() {
			resolve();
		});
	});

	var wss = new WebSocketServer({
		httpServer: server,
		autoAcceptConnections: false
	});

	var connections = [];
	var waiting = [];

	wss.on("request", function(request){
		console.log("Received connection to the spy server");
		var connection = request.accept(null, request.origin);
		connections.push(connection);
		connection.on("close", function(){
			// Remove this connection from the list of connections
			connections.splice(connections.indexOf(connection), 1);
		});
		clearWaiting();
	});

	function Deferred(){
		var dfd = this;
		this.promise = new Promise(function(resolve, reject){
			dfd.resolve = resolve;
			dfd.reject = reject;
		});
	}

	function waitOnConnection() {
		var dfd = new Deferred();
		waiting.push(dfd);
		return dfd.promise;
	}

	function clearWaiting() {
		waiting.forEach(function(dfd){
			dfd.resolve();
		});
		waiting = [];
	}

	function msgToJSON(str){
		var data;
		try {
			data = JSON.parse(str);
		} catch(ex) {
			data = { type: "info", msg: str };
		}
		return data;
	};

	return {
		ready: readyPromise,
		wss: wss,

		runTest: function(data){
			var msg = { scripts: [data] };
			debug("Running a test with " + connections.length + " connections");

			return new Promise(function(resolve){
				var onreply = function(msg){
					debug("Got test reply");
					var data = msgToJSON(msg.utf8Data);
					if(data.type === "info") {
						console.log("Spy info:", data.msg);
						return;
					}

					connections.forEach(function(conn){
						conn.removeListener("message", onreply);
					});
					resolve(data);
				};

				if(connections.length) {
					startTests();
				} else {
					waitOnConnection().then(startTests);
				}

				function startTests(){
					console.log("Running tests on", connections.length);
					connections.forEach(function(conn){
						conn.on("message", onreply);
						conn.sendUTF(JSON.stringify(msg));
					});
				}
			});
		}
	};
};
