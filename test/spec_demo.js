var testSpec = require("../lib/test_spec");

var tests = {
	results: [{
		"module": "Hello world",
		results: [
			{ name: "Prints correctly",
				results: [
					{ assertion: false, message: "I hope this works" },
					{ assertion: true, message: "This should work" }
				] },
			{ name: "Everything works",
				results: [
					{ assertion: true, message: "I think it worked" }
				] }
		]
	}]
};

testSpec(tests);
