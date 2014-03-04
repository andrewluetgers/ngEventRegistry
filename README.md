ngEventRegistry
===============

Events as services. Inject an emitter here, a subscriber there, validate input. Event wrangling achievement unlocked!

# tl;dr

- add ngEventRegistry.js to your angular app (requires lodash or underscore)
- add "ngEventRegistry" as a dependency of your app
- in a config function, inject registerEvents service and call `registerEvents("foo");`
- to broadcast foo event from service or controller inject foo and call it as your broadcast method `foo(bar);`
- somewhere else handle the event with `onFoo(myHandlerFn)`

And you can validate event arguments like so:

 ```javascript
registerEvents("validEvent", funciton(arg) {
	// validate arg here, throw error if invalid
	return arg;
});
```

# One Thing, Leads to Another

[![ScreenShot](https://raw.github.com/andrewluetgers/ngEventRegistry/master/img/oneThing.jpg)](http://youtu.be/UMMnJm1PYOE)

Events are great right? Loose coupling and all. But if you begin to lean
heavily on events one thing will surely lead to another and another,
perhaps forever. An event gets emitted somewhere (who knows from where)
gets handled somewhere else (again who knows where that may be)
and guess what, within that handler something else happens. Yup you
guessed it. Whatever that was, it lead to another event. This is all fine
and good, until it isn't and before you know it you find you're trapped
in a [House of the Devil](http://www.imdb.com/title/tt1172994/) soon to be
part of a satanic ritual that will leave you mentally scarred for life.

How do you escape from this horrible fate? The idea here is that events are
actually "protocols"[1] yet they are not defined anywhere. It's hard to
document and adhere to an undefined protocol. Generally in event systems
this protocol looks like arbitrary event name strings scattered throughout
the codebase and various argument values passed along to the listener from
the emitter/broadcaster call-site. This can quickly become confusing and
unmanageable as complexity compounds quickly when one thing leads to another.

[1] = The concept can be described as "protocol" or "interface" depending on
the language you're thinking of. I'll stick with protocol. See link below:
http://stackoverflow.com/questions/1679145/interface-and-protocol-explanation

### So lets be explicit about our protocol and enforce it programatically.

ngEventRegistry produces injectable services, two for each event. One
service to broadcast the event another to listen for and handle the event.
These event-specific emitter and handler functions enforce a pre-defined
protocol. Argument constructor functions (argSpecs) guarantee any
required argument values are provided correctly. This approach also provides
a single touch-point for defining, documenting  and refactoring this protocol.

See usage at bottom of file.

Events as services eliminates hard-coded strings, typos are less of a problem
and refactoring becomes easier. The real benefit of this approach is that it is
much more self documenting and tools like Angular Batarang can now graph the
relationships of events with other services. Although better tooling is still
needed this is one step toward the visualization of application communication.

### Visualizing application communication

Below you can see the Angular Batarang dependency view. It shows what services
are injected into other services. Now that our events are also services we can
easily see what services broadcast a specific event and which ones respond to
that event. One limitation of this view is that it does not show the same for
controllers (left). This seems to be an important omission when trying to visualize
communication between services and controllers. BUT there is a simple solution
to this problem (right). Take a look at the controllersAsServices.html example
to see how it's done.

![ScreenShot](https://raw.github.com/andrewluetgers/ngEventRegistry/master/img/batarang.jpg)

### How it works

While angular provides emit and broadcast methods this approach only
broadcasts events down from the rootScope. This ensures universal visibility
of events and simplifies thinking about their behavior.

This approach also provides the ability to register an event along with
a an "argSpec" function or set of functions that enforce what values can
be broadcast. This validation is pass-through by default but can be used
to ensure program correctness as needed.

an arg spec looks like this.

 ```javascript
function(argIn, i) {
  // validate argIn throw an error if there is a problem
  return argOut;
}
```

as described in http://docs.angularjs.org/api/ng.$rootScope.Scope
the arguments of the "broadcast" scope method are optional arguments to
be passed to the event listeners.

an argSpec is a function that validates its input and returns a valid arg
that will be provided to the event handler. Arrays of argSpec functions are
supported if different functions are needed per arg, otherwise you can use the
i argument provided to the argSpec function to determine what argument is being
provided. This function should throw an error if the provided value is unexpected.


### usage
see examples folder for more

 ```javascript
// this is completely contrived to demonstrate functionality not a real use case, sorry.

angular.module("myApp", ["ngEventRegistry", "myModule"])
	.controller("myAppCtrl", function(onLoading, onMyNumberEvent, myNumberService) {

		onLoading(function() {
			console.log("loading event fired here are the args", arguments);
		});

		// here we can handle the numberEvent
		onMyNumberEvent(function(num) {
			console.log("Should be a number -> " + num);
		});

		myNumberService(55);
		myNumberService("foo");

	});

angular.module("myModule", [])
	.config(function(registerEvents) {
		// register events related to this module here in the config

		// if you only provide names, validation will be pass-through
		registerEvents("loading", "anotherEvent");

		// register multiple events with validation
		registerEvents({
			myNumberEvent:  numberOrNull, // this can be an array of functions, one for each arg passed in
			anotherEvent:   registerEvents.passThrough
		});

		// the event handler is provided the values returned by the validation functions
		// how you deal with invalid inputs is up to you
		// if input is bad you could fix it and return the right thing
		// but ideally values are expected to be valid and you should throw an
		// error and fix issues in the code as they arise.
		function numberOrNull(arg, i) {
			if (isNaN(arg)) {
				throw new TypeError("Expected number but saw " + arg);
			}
			return arg;
		}
	})
	.factory("myNumberService", function(myNumberEvent, loading) {
		return function(num) {
			// now we can emit our number event
			setTimeout(function() {
				myNumberEvent(num);
			}, 1000);

			loading("loading", "foo", "bar", num);
		};
	});
