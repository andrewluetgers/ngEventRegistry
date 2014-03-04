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

	registerEvents("validEvent", funciton(arg) {
		// validate arg here, throw error if invalid
		return arg;
	});

# One Thing, Leads to Another

[![ScreenShot](https://raw.github.com/andrewluetgers/ngEventRegistry/master/oneThing.jpg)](http://youtu.be/UMMnJm1PYOE)

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

ngEventRegistry produces injectable services two for each event. One
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

While angular provides emit and broadcast methods this approach only
broadcasts events down from the rootScope. This ensures universal visibility
of events and simplifies thinking about their behavior.

This approach also provides the ability to register an event along with
a an "argSpec" function or set of functions that enforce what values can
be broadcast. This validation is pass-through by default but can used to ensure
program correctness as needed.

an arg spec looks like this.

	function(argIn, i) {
	  // validate argIn throw an error if there is a problem
	  return argOut;
	}

as described in http://docs.angularjs.org/api/ng.$rootScope.Scope
the arguments of the "broadcast" scope method are optional arguments to
be passed to the event listeners.

an argSpec is a function that validates its input and returns a valid arg
that will be provided to the event handler. Arrays of argSpec functions are
supported if different functions are needed per arg, otherwise you can use the
i arg provided to the argSpec function to determine what argument is being
provided this function should throw an error if the provided value is unexpected


### usage: register app events

	angular.module("myModule", ["eventRegistry"])

		.config(function(registerEvents) {
		
			// register events realted to this module here in the config
			
			function numberOrNull(arg, i) {
				return typeof arg == "number" ? arg : null
			}

			registerEvents({
				myNumberEvent:	numberOrNull, // this can be an array of functions, one for each arg passed in
				anotherEvent:	registerEvents.passThrough
			});

			// if you only provide names as arguments validation will be pass-through
			registerEvents("testEvent", "anotherEvent");
		})
		.service("myService", function(myNumberEvent) {
			// now we can emit our number event
			myNumberEvent(5);
		});
		
		
		
	// now in another module we can listen for and handle the event
	// first we need to require the parent module so we can inject the handler service
	
	angular.module("myOtherModule", ["myModule"])
	
		.service("myOtherService", function(onMyNumberEvent) {
			// here we can handle the numberEvent
			onMyNumberEvent(function(num) {
				console.log("Should be a number -> " + num);
			});
		});		
	
