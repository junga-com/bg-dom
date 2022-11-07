
export class BGError extends Error {
	constructor(txtMsg, ...p)
	{
		super(txtMsg);
		this.p = p;
		console.error("BGError: "+txtMsg, ...p)
	}
}

// 2022-11 bobg: this is not working in atom under nodejs 12. I can see in the console that process._events has two callbacks for
//               'unhandledRejection' but neither are called. This one is the second in the list. The other is from atom in index.js
//               in the window.onload function.
//               The message that is displayed comes from the nodejs C++ code
//                        node-v12.14.1/deps/v8/src/inspector/injected-script.cc
//                           218,23:             .setText("Uncaught (in promise)" + message)
process.on('unhandledRejection', (error, promise)=>{
	console.console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! HERE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
	if (error instanceof BGError) {
		console.error("Uncaught (in promise) Error: "+error.txtMsg, ...error.p, promise)
	} else {
		console.error("Uncaught (in promise) Error: ", error, promise)
	}
})
