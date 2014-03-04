// MIT license - andrew.luetgers at gmail.com

angular.module("ngEventRegistry", [], function($provide) {

	function evFn(name, argSpec, $scope, inputArgs) {
		// the inputArgs are passed through any argSpec function/s
		var args = _.map(inputArgs, function(arg, i) {
			if (_.isFunction(argSpec)) {
				return argSpec(arg, i);

			} else if (_.isArray(argSpec)) {
				return argSpec[i](arg, i);

			} else {
				throw new Error("No Arg-Spec defined for event " + name + ". " +
					"Expected a function or array of functions but saw " + typeof argSpec);
			}
		});

		args.unshift(name);
		return $scope.$broadcast.apply($scope, args);
	}


	function getEvMethod(name, argSpec, $scope) {
		var self = {
			name: name
		};

		// this is the event broadcast function
		// all args passed to this function get run through the
		// argspec function/s, those returned values are then passed
		// in the same order to the event listener functions
		function fn() {
			var inputArgs = _.values(arguments);
			fn.count++;
			return evFn.call(self, name, argSpec, $scope, inputArgs);
		}

		return fn;
	}

	/**
	 * for a given argSpec + name produces two injectable services the
	 * first service is set as the event name given and will have emit and
	 * broadcast methods with similar signatures to the Angular scope
	 * methods but in this case the first argument is the scope object
	 * instead of the event name. In this case the event name is intrinsic
	 * to the service so is not needed but the scope is unknown.
	 *
	 * The second service produced is a function for registering listeners
	 * for the given event. Given any "eventName" the injectable will
	 * be set as "onEventName" Again the event name is intrinsic to the
	 * injectable service but the scope must be provided as the first arg.
	 *
	 * @param argSpec function or array of functions that validate input
	 * and return an argument that will be passed to an event handler
	 * @param name string name of the event
	 *
	 */
	function registerEvent(argSpec, name) {

		$provide.factory(name, ["$rootScope", function($rootScope) {
			/**
			 * @param ...* any remaining arguments will be passed into the argSpec constructor/s
			 * event handlers receive argSpc return vals as as arguments.
			 * @returns Event object, see http://docs.angularjs.org/api/ng.$rootScope.Scope#$on
			 */
			return getEvMethod(name, argSpec, $rootScope);
		}]);

		var onName = "on" + name.substr(0, 1).toUpperCase() + name.substr(1, name.length);

		$provide.factory(onName, ["$rootScope", function($rootScope) {
			/**
			 * @param fn event handler that accepts the arguments (validated by argspec)
			 * that were provided to the event's broadcast function
			 * @returns function a de-registration function for this listener.
			 */
			function handler(fn) {
				return $rootScope.$on(name, function() {
					var args = _.values(arguments);
					args.shift(); // drop the $rootScope arg it is always the same
					fn.apply(this, args);
					handler.count++;
				});
			}

			handler.name = onName;
			handler.count = 0;

			return handler;
		}]);
	}


	// allow any or no value
	function passThrough(arg) {
		return arg;
	}

	function registerPassThroughEvent(event) {
		registerEvent(passThrough, event);
	}

	function registerEvents(events) {
		if (_.isString(events)) {
			_.each(_.values(arguments), registerPassThroughEvent);
		} else if (_.isArray(events)) {
			_.each(events, registerPassThroughEvent);
		} else if (_.isObject(events)) {
			_.each(events, registerEvent);
		} else {
			throw new Error("Expected event name string/s (implied pass through validation)" +
				" or an object with keys as eventNames and values as arg spec function/array of functions");
		}
	}

	// register all Angular events as passThrough (no validation)
//	registerEvents([
//		"$locationChangeStart",
//		"$locationChangeSuccess",
//		"$routeUpdate",
//		"$routeChangeStart",
//		"$routeChangeSuccess",
//		"$routeChangeError",
//		"$destroy",
//		"$includeContentLoaded",
//		"$viewContentLoaded"
//	]);

	registerEvents.passThrough = passThrough;

	// make the registerEvents function a service
	$provide.constant("registerEvents", registerEvents);
});