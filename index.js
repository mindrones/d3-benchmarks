/* https://github.com/mindrones/d3-benchmarks */
(function (d3,_) {
'use strict';

d3 = 'default' in d3 ? d3['default'] : d3;
_ = 'default' in _ ? _['default'] : _;

var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
};
var root = (objectTypes[typeof self] && self) || (objectTypes[typeof window] && window);
var freeGlobal = objectTypes[typeof global] && global;
if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    root = freeGlobal;
}

function isFunction(x) {
    return typeof x === 'function';
}

var isArray = Array.isArray || (function (x) { return x && typeof x.length === 'number'; });

function isObject(x) {
    return x != null && typeof x === 'object';
}

// typeof any so that it we don't have to cast when comparing a result to the error object
var errorObject = { e: {} };

var tryCatchTarget;
function tryCatcher() {
    try {
        return tryCatchTarget.apply(this, arguments);
    }
    catch (e) {
        errorObject.e = e;
        return errorObject;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

/**
 * An error thrown when one or more errors have occurred during the
 * `unsubscribe` of a {@link Subscription}.
 */
var UnsubscriptionError = (function (Error) {
  function UnsubscriptionError(errors) {
        Error.call(this);
        this.errors = errors;
        var err = Error.call(this, errors ?
            ((errors.length) + " errors occurred during unsubscription:\n  " + (errors.map(function (err, i) { return ((i + 1) + ") " + (err.toString())); }).join('\n  '))) : '');
        this.name = err.name = 'UnsubscriptionError';
        this.stack = err.stack;
        this.message = err.message;
    }

  if ( Error ) UnsubscriptionError.__proto__ = Error;
  UnsubscriptionError.prototype = Object.create( Error && Error.prototype );
  UnsubscriptionError.prototype.constructor = UnsubscriptionError;

  return UnsubscriptionError;
}(Error));

/**
 * Represents a disposable resource, such as the execution of an Observable. A
 * Subscription has one important method, `unsubscribe`, that takes no argument
 * and just disposes the resource held by the subscription.
 *
 * Additionally, subscriptions may be grouped together through the `add()`
 * method, which will attach a child Subscription to the current Subscription.
 * When a Subscription is unsubscribed, all its children (and its grandchildren)
 * will be unsubscribed as well.
 *
 * @class Subscription
 */
var Subscription = function Subscription(unsubscribe) {
    /**
     * A flag to indicate whether this Subscription has already been unsubscribed.
     * @type {boolean}
     */
    this.closed = false;
    if (unsubscribe) {
        this._unsubscribe = unsubscribe;
    }
};
/**
 * Disposes the resources held by the subscription. May, for instance, cancel
 * an ongoing Observable execution or cancel any other type of work that
 * started when the Subscription was created.
 * @return {void}
 */
Subscription.prototype.unsubscribe = function unsubscribe () {
    var hasErrors = false;
    var errors;
    if (this.closed) {
        return;
    }
    this.closed = true;
    var ref = this;
        var _unsubscribe = ref._unsubscribe;
        var _subscriptions = ref._subscriptions;
    this._subscriptions = null;
    if (isFunction(_unsubscribe)) {
        var trial = tryCatch(_unsubscribe).call(this);
        if (trial === errorObject) {
            hasErrors = true;
            (errors = errors || []).push(errorObject.e);
        }
    }
    if (isArray(_subscriptions)) {
        var index = -1;
        var len = _subscriptions.length;
        while (++index < len) {
            var sub = _subscriptions[index];
            if (isObject(sub)) {
                var trial$1 = tryCatch(sub.unsubscribe).call(sub);
                if (trial$1 === errorObject) {
                    hasErrors = true;
                    errors = errors || [];
                    var err = errorObject.e;
                    if (err instanceof UnsubscriptionError) {
                        errors = errors.concat(err.errors);
                    }
                    else {
                        errors.push(err);
                    }
                }
            }
        }
    }
    if (hasErrors) {
        throw new UnsubscriptionError(errors);
    }
};
/**
 * Adds a tear down to be called during the unsubscribe() of this
 * Subscription.
 *
 * If the tear down being added is a subscription that is already
 * unsubscribed, is the same reference `add` is being called on, or is
 * `Subscription.EMPTY`, it will not be added.
 *
 * If this subscription is already in an `closed` state, the passed
 * tear down logic will be executed immediately.
 *
 * @param {TeardownLogic} teardown The additional logic to execute on
 * teardown.
 * @return {Subscription} Returns the Subscription used or created to be
 * added to the inner subscriptions list. This Subscription can be used with
 * `remove()` to remove the passed teardown logic from the inner subscriptions
 * list.
 */
Subscription.prototype.add = function add (teardown) {
    if (!teardown || (teardown === Subscription.EMPTY)) {
        return Subscription.EMPTY;
    }
    if (teardown === this) {
        return this;
    }
    var sub = teardown;
    switch (typeof teardown) {
        case 'function':
            sub = new Subscription(teardown);
        case 'object':
            if (sub.closed || typeof sub.unsubscribe !== 'function') {
                break;
            }
            else if (this.closed) {
                sub.unsubscribe();
            }
            else {
                (this._subscriptions || (this._subscriptions = [])).push(sub);
            }
            break;
        default:
            throw new Error('unrecognized teardown ' + teardown + ' added to Subscription.');
    }
    return sub;
};
/**
 * Removes a Subscription from the internal list of subscriptions that will
 * unsubscribe during the unsubscribe process of this Subscription.
 * @param {Subscription} subscription The subscription to remove.
 * @return {void}
 */
Subscription.prototype.remove = function remove (subscription) {
    // HACK: This might be redundant because of the logic in `add()`
    if (subscription == null || (subscription === this) || (subscription === Subscription.EMPTY)) {
        return;
    }
    var subscriptions = this._subscriptions;
    if (subscriptions) {
        var subscriptionIndex = subscriptions.indexOf(subscription);
        if (subscriptionIndex !== -1) {
            subscriptions.splice(subscriptionIndex, 1);
        }
    }
};
Subscription.EMPTY = (function (empty) {
    empty.closed = true;
    return empty;
}(new Subscription()));

var empty = {
    closed: true,
    next: function next(value) { },
    error: function error(err) { throw err; },
    complete: function complete() { }
};

var Symbol$1 = root.Symbol;
var $$rxSubscriber = (typeof Symbol$1 === 'function' && typeof Symbol$1.for === 'function') ?
    Symbol$1.for('rxSubscriber') : '@@rxSubscriber';

/**
 * Implements the {@link Observer} interface and extends the
 * {@link Subscription} class. While the {@link Observer} is the public API for
 * consuming the values of an {@link Observable}, all Observers get converted to
 * a Subscriber, in order to provide Subscription-like capabilities such as
 * `unsubscribe`. Subscriber is a common type in RxJS, and crucial for
 * implementing operators, but it is rarely used as a public API.
 *
 * @class Subscriber<T>
 */
var Subscriber = (function (Subscription$$1) {
    function Subscriber(destinationOrNext, error, complete) {
        Subscription$$1.call(this);
        this.syncErrorValue = null;
        this.syncErrorThrown = false;
        this.syncErrorThrowable = false;
        this.isStopped = false;
        switch (arguments.length) {
            case 0:
                this.destination = empty;
                break;
            case 1:
                if (!destinationOrNext) {
                    this.destination = empty;
                    break;
                }
                if (typeof destinationOrNext === 'object') {
                    if (destinationOrNext instanceof Subscriber) {
                        this.destination = destinationOrNext;
                        this.destination.add(this);
                    }
                    else {
                        this.syncErrorThrowable = true;
                        this.destination = new SafeSubscriber(this, destinationOrNext);
                    }
                    break;
                }
            default:
                this.syncErrorThrowable = true;
                this.destination = new SafeSubscriber(this, destinationOrNext, error, complete);
                break;
        }
    }

    if ( Subscription$$1 ) Subscriber.__proto__ = Subscription$$1;
    Subscriber.prototype = Object.create( Subscription$$1 && Subscription$$1.prototype );
    Subscriber.prototype.constructor = Subscriber;
    Subscriber.prototype[$$rxSubscriber] = function () { return this; };
    /**
     * A static factory for a Subscriber, given a (potentially partial) definition
     * of an Observer.
     * @param {function(x: ?T): void} [next] The `next` callback of an Observer.
     * @param {function(e: ?any): void} [error] The `error` callback of an
     * Observer.
     * @param {function(): void} [complete] The `complete` callback of an
     * Observer.
     * @return {Subscriber<T>} A Subscriber wrapping the (partially defined)
     * Observer represented by the given arguments.
     */
    Subscriber.create = function create (next, error, complete) {
        var subscriber = new Subscriber(next, error, complete);
        subscriber.syncErrorThrowable = false;
        return subscriber;
    };
    /**
     * The {@link Observer} callback to receive notifications of type `next` from
     * the Observable, with a value. The Observable may call this method 0 or more
     * times.
     * @param {T} [value] The `next` value.
     * @return {void}
     */
    Subscriber.prototype.next = function next (value) {
        if (!this.isStopped) {
            this._next(value);
        }
    };
    /**
     * The {@link Observer} callback to receive notifications of type `error` from
     * the Observable, with an attached {@link Error}. Notifies the Observer that
     * the Observable has experienced an error condition.
     * @param {any} [err] The `error` exception.
     * @return {void}
     */
    Subscriber.prototype.error = function error (err) {
        if (!this.isStopped) {
            this.isStopped = true;
            this._error(err);
        }
    };
    /**
     * The {@link Observer} callback to receive a valueless notification of type
     * `complete` from the Observable. Notifies the Observer that the Observable
     * has finished sending push-based notifications.
     * @return {void}
     */
    Subscriber.prototype.complete = function complete () {
        if (!this.isStopped) {
            this.isStopped = true;
            this._complete();
        }
    };
    Subscriber.prototype.unsubscribe = function unsubscribe () {
        if (this.closed) {
            return;
        }
        this.isStopped = true;
        Subscription$$1.prototype.unsubscribe.call(this);
    };
    Subscriber.prototype._next = function _next (value) {
        this.destination.next(value);
    };
    Subscriber.prototype._error = function _error (err) {
        this.destination.error(err);
        this.unsubscribe();
    };
    Subscriber.prototype._complete = function _complete () {
        this.destination.complete();
        this.unsubscribe();
    };

    return Subscriber;
}(Subscription));
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SafeSubscriber = (function (Subscriber) {
    function SafeSubscriber(_parent, observerOrNext, error, complete) {
        Subscriber.call(this);
        this._parent = _parent;
        var next;
        var context = this;
        if (isFunction(observerOrNext)) {
            next = observerOrNext;
        }
        else if (observerOrNext) {
            context = observerOrNext;
            next = observerOrNext.next;
            error = observerOrNext.error;
            complete = observerOrNext.complete;
            if (isFunction(context.unsubscribe)) {
                this.add(context.unsubscribe.bind(context));
            }
            context.unsubscribe = this.unsubscribe.bind(this);
        }
        this._context = context;
        this._next = next;
        this._error = error;
        this._complete = complete;
    }

    if ( Subscriber ) SafeSubscriber.__proto__ = Subscriber;
    SafeSubscriber.prototype = Object.create( Subscriber && Subscriber.prototype );
    SafeSubscriber.prototype.constructor = SafeSubscriber;
    SafeSubscriber.prototype.next = function next (value) {
        if (!this.isStopped && this._next) {
            var ref = this;
            var _parent = ref._parent;
            if (!_parent.syncErrorThrowable) {
                this.__tryOrUnsub(this._next, value);
            }
            else if (this.__tryOrSetError(_parent, this._next, value)) {
                this.unsubscribe();
            }
        }
    };
    SafeSubscriber.prototype.error = function error (err) {
        if (!this.isStopped) {
            var ref = this;
            var _parent = ref._parent;
            if (this._error) {
                if (!_parent.syncErrorThrowable) {
                    this.__tryOrUnsub(this._error, err);
                    this.unsubscribe();
                }
                else {
                    this.__tryOrSetError(_parent, this._error, err);
                    this.unsubscribe();
                }
            }
            else if (!_parent.syncErrorThrowable) {
                this.unsubscribe();
                throw err;
            }
            else {
                _parent.syncErrorValue = err;
                _parent.syncErrorThrown = true;
                this.unsubscribe();
            }
        }
    };
    SafeSubscriber.prototype.complete = function complete () {
        if (!this.isStopped) {
            var ref = this;
            var _parent = ref._parent;
            if (this._complete) {
                if (!_parent.syncErrorThrowable) {
                    this.__tryOrUnsub(this._complete);
                    this.unsubscribe();
                }
                else {
                    this.__tryOrSetError(_parent, this._complete);
                    this.unsubscribe();
                }
            }
            else {
                this.unsubscribe();
            }
        }
    };
    SafeSubscriber.prototype.__tryOrUnsub = function __tryOrUnsub (fn, value) {
        try {
            fn.call(this._context, value);
        }
        catch (err) {
            this.unsubscribe();
            throw err;
        }
    };
    SafeSubscriber.prototype.__tryOrSetError = function __tryOrSetError (parent, fn, value) {
        try {
            fn.call(this._context, value);
        }
        catch (err) {
            parent.syncErrorValue = err;
            parent.syncErrorThrown = true;
            return true;
        }
        return false;
    };
    SafeSubscriber.prototype._unsubscribe = function _unsubscribe () {
        var ref = this;
        var _parent = ref._parent;
        this._context = null;
        this._parent = null;
        _parent.unsubscribe();
    };

    return SafeSubscriber;
}(Subscriber));

function toSubscriber(nextOrObserver, error, complete) {
    if (nextOrObserver) {
        if (nextOrObserver instanceof Subscriber) {
            return nextOrObserver;
        }
        if (nextOrObserver[$$rxSubscriber]) {
            return nextOrObserver[$$rxSubscriber]();
        }
    }
    if (!nextOrObserver && !error && !complete) {
        return new Subscriber();
    }
    return new Subscriber(nextOrObserver, error, complete);
}

function getSymbolObservable(context) {
    var $$observable;
    var Symbol = context.Symbol;
    if (typeof Symbol === 'function') {
        if (Symbol.observable) {
            $$observable = Symbol.observable;
        }
        else {
            $$observable = Symbol('observable');
            Symbol.observable = $$observable;
        }
    }
    else {
        $$observable = '@@observable';
    }
    return $$observable;
}
var $$observable = getSymbolObservable(root);

/**
 * A representation of any set of values over any amount of time. This the most basic building block
 * of RxJS.
 *
 * @class Observable<T>
 */
var Observable = function Observable(subscribe) {
    this._isScalar = false;
    if (subscribe) {
        this._subscribe = subscribe;
    }
};
/**
 * Creates a new Observable, with this Observable as the source, and the passed
 * operator defined as the new observable's operator.
 * @method lift
 * @param {Operator} operator the operator defining the operation to take on the observable
 * @return {Observable} a new observable with the Operator applied
 */
Observable.prototype.lift = function lift (operator) {
    var observable = new Observable();
    observable.source = this;
    observable.operator = operator;
    return observable;
};
/**
 * Registers handlers for handling emitted values, error and completions from the observable, and
 *  executes the observable's subscriber function, which will take action to set up the underlying data stream
 * @method subscribe
 * @param {PartialObserver|Function} observerOrNext (optional) either an observer defining all functions to be called,
 *  or the first of three possible handlers, which is the handler for each value emitted from the observable.
 * @param {Function} error (optional) a handler for a terminal event resulting from an error. If no error handler is provided,
 *  the error will be thrown as unhandled
 * @param {Function} complete (optional) a handler for a terminal event resulting from successful completion.
 * @return {ISubscription} a subscription reference to the registered handlers
 */
Observable.prototype.subscribe = function subscribe (observerOrNext, error, complete) {
    var ref = this;
        var operator = ref.operator;
    var sink = toSubscriber(observerOrNext, error, complete);
    if (operator) {
        operator.call(sink, this);
    }
    else {
        sink.add(this._subscribe(sink));
    }
    if (sink.syncErrorThrowable) {
        sink.syncErrorThrowable = false;
        if (sink.syncErrorThrown) {
            throw sink.syncErrorValue;
        }
    }
    return sink;
};
/**
 * @method forEach
 * @param {Function} next a handler for each value emitted by the observable
 * @param {PromiseConstructor} [PromiseCtor] a constructor function used to instantiate the Promise
 * @return {Promise} a promise that either resolves on observable completion or
 *  rejects with the handled error
 */
Observable.prototype.forEach = function forEach (next, PromiseCtor) {
        var this$1 = this;

    if (!PromiseCtor) {
        if (root.Rx && root.Rx.config && root.Rx.config.Promise) {
            PromiseCtor = root.Rx.config.Promise;
        }
        else if (root.Promise) {
            PromiseCtor = root.Promise;
        }
    }
    if (!PromiseCtor) {
        throw new Error('no Promise impl found');
    }
    return new PromiseCtor(function (resolve, reject) {
        var subscription = this$1.subscribe(function (value) {
            if (subscription) {
                // if there is a subscription, then we can surmise
                // the next handling is asynchronous. Any errors thrown
                // need to be rejected explicitly and unsubscribe must be
                // called manually
                try {
                    next(value);
                }
                catch (err) {
                    reject(err);
                    subscription.unsubscribe();
                }
            }
            else {
                // if there is NO subscription, then we're getting a nexted
                // value synchronously during subscription. We can just call it.
                // If it errors, Observable's `subscribe` will ensure the
                // unsubscription logic is called, then synchronously rethrow the error.
                // After that, Promise will trap the error and send it
                // down the rejection path.
                next(value);
            }
        }, reject, resolve);
    });
};
Observable.prototype._subscribe = function _subscribe (subscriber) {
    return this.source.subscribe(subscriber);
};
/**
 * An interop point defined by the es7-observable spec https://github.com/zenparsing/es-observable
 * @method Symbol.observable
 * @return {Observable} this instance of the observable
 */
Observable.prototype[$$observable] = function () {
    return this;
};
// HACK: Since TypeScript inherits static properties too, we have to
// fight against TypeScript here so Subject can have a different static create signature
/**
 * Creates a new cold Observable by calling the Observable constructor
 * @static true
 * @owner Observable
 * @method create
 * @param {Function} subscribe? the subscriber function to be passed to the Observable constructor
 * @return {Observable} a new cold observable
 */
Observable.create = function (subscribe) {
    return new Observable(subscribe);
};

/**
 * An error thrown when an action is invalid because the object has been
 * unsubscribed.
 *
 * @see {@link Subject}
 * @see {@link BehaviorSubject}
 *
 * @class ObjectUnsubscribedError
 */
var ObjectUnsubscribedError = (function (Error) {
    function ObjectUnsubscribedError() {
        var err = Error.call(this, 'object unsubscribed');
        this.name = err.name = 'ObjectUnsubscribedError';
        this.stack = err.stack;
        this.message = err.message;
    }

    if ( Error ) ObjectUnsubscribedError.__proto__ = Error;
    ObjectUnsubscribedError.prototype = Object.create( Error && Error.prototype );
    ObjectUnsubscribedError.prototype.constructor = ObjectUnsubscribedError;

    return ObjectUnsubscribedError;
}(Error));

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SubjectSubscription = (function (Subscription$$1) {
    function SubjectSubscription(subject, subscriber) {
        Subscription$$1.call(this);
        this.subject = subject;
        this.subscriber = subscriber;
        this.closed = false;
    }

    if ( Subscription$$1 ) SubjectSubscription.__proto__ = Subscription$$1;
    SubjectSubscription.prototype = Object.create( Subscription$$1 && Subscription$$1.prototype );
    SubjectSubscription.prototype.constructor = SubjectSubscription;
    SubjectSubscription.prototype.unsubscribe = function unsubscribe () {
        if (this.closed) {
            return;
        }
        this.closed = true;
        var subject = this.subject;
        var observers = subject.observers;
        this.subject = null;
        if (!observers || observers.length === 0 || subject.isStopped || subject.closed) {
            return;
        }
        var subscriberIndex = observers.indexOf(this.subscriber);
        if (subscriberIndex !== -1) {
            observers.splice(subscriberIndex, 1);
        }
    };

    return SubjectSubscription;
}(Subscription));

/**
 * @class SubjectSubscriber<T>
 */
var SubjectSubscriber = (function (Subscriber$$1) {
    function SubjectSubscriber(destination) {
        Subscriber$$1.call(this, destination);
        this.destination = destination;
    }

    if ( Subscriber$$1 ) SubjectSubscriber.__proto__ = Subscriber$$1;
    SubjectSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    SubjectSubscriber.prototype.constructor = SubjectSubscriber;

    return SubjectSubscriber;
}(Subscriber));
/**
 * @class Subject<T>
 */
var Subject = (function (Observable$$1) {
    function Subject() {
        Observable$$1.call(this);
        this.observers = [];
        this.closed = false;
        this.isStopped = false;
        this.hasError = false;
        this.thrownError = null;
    }

    if ( Observable$$1 ) Subject.__proto__ = Observable$$1;
    Subject.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    Subject.prototype.constructor = Subject;
    Subject.prototype[$$rxSubscriber] = function () {
        return new SubjectSubscriber(this);
    };
    Subject.prototype.lift = function lift (operator) {
        var subject = new AnonymousSubject(this, this);
        subject.operator = operator;
        return subject;
    };
    Subject.prototype.next = function next (value) {
        if (this.closed) {
            throw new ObjectUnsubscribedError();
        }
        if (!this.isStopped) {
            var ref = this;
            var observers = ref.observers;
            var len = observers.length;
            var copy = observers.slice();
            for (var i = 0; i < len; i++) {
                copy[i].next(value);
            }
        }
    };
    Subject.prototype.error = function error (err) {
        if (this.closed) {
            throw new ObjectUnsubscribedError();
        }
        this.hasError = true;
        this.thrownError = err;
        this.isStopped = true;
        var ref = this;
        var observers = ref.observers;
        var len = observers.length;
        var copy = observers.slice();
        for (var i = 0; i < len; i++) {
            copy[i].error(err);
        }
        this.observers.length = 0;
    };
    Subject.prototype.complete = function complete () {
        if (this.closed) {
            throw new ObjectUnsubscribedError();
        }
        this.isStopped = true;
        var ref = this;
        var observers = ref.observers;
        var len = observers.length;
        var copy = observers.slice();
        for (var i = 0; i < len; i++) {
            copy[i].complete();
        }
        this.observers.length = 0;
    };
    Subject.prototype.unsubscribe = function unsubscribe () {
        this.isStopped = true;
        this.closed = true;
        this.observers = null;
    };
    Subject.prototype._subscribe = function _subscribe (subscriber) {
        if (this.closed) {
            throw new ObjectUnsubscribedError();
        }
        else if (this.hasError) {
            subscriber.error(this.thrownError);
            return Subscription.EMPTY;
        }
        else if (this.isStopped) {
            subscriber.complete();
            return Subscription.EMPTY;
        }
        else {
            this.observers.push(subscriber);
            return new SubjectSubscription(this, subscriber);
        }
    };
    Subject.prototype.asObservable = function asObservable () {
        var observable = new Observable$$1();
        observable.source = this;
        return observable;
    };

    return Subject;
}(Observable));
Subject.create = function (destination, source) {
    return new AnonymousSubject(destination, source);
};
/**
 * @class AnonymousSubject<T>
 */
var AnonymousSubject = (function (Subject) {
    function AnonymousSubject(destination, source) {
        Subject.call(this);
        this.destination = destination;
        this.source = source;
    }

    if ( Subject ) AnonymousSubject.__proto__ = Subject;
    AnonymousSubject.prototype = Object.create( Subject && Subject.prototype );
    AnonymousSubject.prototype.constructor = AnonymousSubject;
    AnonymousSubject.prototype.next = function next (value) {
        var ref = this;
        var destination = ref.destination;
        if (destination && destination.next) {
            destination.next(value);
        }
    };
    AnonymousSubject.prototype.error = function error (err) {
        var ref = this;
        var destination = ref.destination;
        if (destination && destination.error) {
            this.destination.error(err);
        }
    };
    AnonymousSubject.prototype.complete = function complete () {
        var ref = this;
        var destination = ref.destination;
        if (destination && destination.complete) {
            this.destination.complete();
        }
    };
    AnonymousSubject.prototype._subscribe = function _subscribe (subscriber) {
        var ref = this;
        var source = ref.source;
        if (source) {
            return this.source.subscribe(subscriber);
        }
        else {
            return Subscription.EMPTY;
        }
    };

    return AnonymousSubject;
}(Subject));

/**
 * @class AsyncSubject<T>
 */
var AsyncSubject = (function (Subject$$1) {
    function AsyncSubject() {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        Subject$$1.apply(this, args);
        this.value = null;
        this.hasNext = false;
        this.hasCompleted = false;
    }

    if ( Subject$$1 ) AsyncSubject.__proto__ = Subject$$1;
    AsyncSubject.prototype = Object.create( Subject$$1 && Subject$$1.prototype );
    AsyncSubject.prototype.constructor = AsyncSubject;
    AsyncSubject.prototype._subscribe = function _subscribe (subscriber) {
        if (this.hasCompleted && this.hasNext) {
            subscriber.next(this.value);
            subscriber.complete();
            return Subscription.EMPTY;
        }
        else if (this.hasError) {
            subscriber.error(this.thrownError);
            return Subscription.EMPTY;
        }
        return Subject$$1.prototype._subscribe.call(this, subscriber);
    };
    AsyncSubject.prototype.next = function next (value) {
        if (!this.hasCompleted) {
            this.value = value;
            this.hasNext = true;
        }
    };
    AsyncSubject.prototype.complete = function complete () {
        this.hasCompleted = true;
        if (this.hasNext) {
            Subject$$1.prototype.next.call(this, this.value);
        }
        Subject$$1.prototype.complete.call(this);
    };

    return AsyncSubject;
}(Subject));

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var BoundCallbackObservable = (function (Observable$$1) {
    function BoundCallbackObservable(callbackFunc, selector, args, scheduler) {
        Observable$$1.call(this);
        this.callbackFunc = callbackFunc;
        this.selector = selector;
        this.args = args;
        this.scheduler = scheduler;
    }

    if ( Observable$$1 ) BoundCallbackObservable.__proto__ = Observable$$1;
    BoundCallbackObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    BoundCallbackObservable.prototype.constructor = BoundCallbackObservable;
    /* tslint:enable:max-line-length */
    /**
     * Converts a callback API to a function that returns an Observable.
     *
     * <span class="informal">Give it a function `f` of type `f(x, callback)` and
     * it will return a function `g` that when called as `g(x)` will output an
     * Observable.</span>
     *
     * `bindCallback` is not an operator because its input and output are not
     * Observables. The input is a function `func` with some parameters, but the
     * last parameter must be a callback function that `func` calls when it is
     * done. The output of `bindCallback` is a function that takes the same
     * parameters as `func`, except the last one (the callback). When the output
     * function is called with arguments, it will return an Observable where the
     * results will be delivered to.
     *
     * @example <caption>Convert jQuery's getJSON to an Observable API</caption>
     * // Suppose we have jQuery.getJSON('/my/url', callback)
     * var getJSONAsObservable = Rx.Observable.bindCallback(jQuery.getJSON);
     * var result = getJSONAsObservable('/my/url');
     * result.subscribe(x => console.log(x), e => console.error(e));
     *
     * @see {@link bindNodeCallback}
     * @see {@link from}
     * @see {@link fromPromise}
     *
     * @param {function} func Function with a callback as the last parameter.
     * @param {function} selector A function which takes the arguments from the
     * callback and maps those a value to emit on the output Observable.
     * @param {Scheduler} [scheduler] The scheduler on which to schedule the
     * callbacks.
     * @return {function(...params: *): Observable} A function which returns the
     * Observable that delivers the same values the callback would deliver.
     * @static true
     * @name bindCallback
     * @owner Observable
     */
    BoundCallbackObservable.create = function create (func, selector, scheduler) {
        if ( selector === void 0 ) selector = undefined;

        return function () {
            var args = [], len = arguments.length;
            while ( len-- ) args[ len ] = arguments[ len ];

            return new BoundCallbackObservable(func, selector, args, scheduler);
        };
    };
    BoundCallbackObservable.prototype._subscribe = function _subscribe (subscriber) {
        var callbackFunc = this.callbackFunc;
        var args = this.args;
        var scheduler = this.scheduler;
        var subject = this.subject;
        if (!scheduler) {
            if (!subject) {
                subject = this.subject = new AsyncSubject();
                var handler = function handlerFn() {
                    var innerArgs = [], len = arguments.length;
                    while ( len-- ) innerArgs[ len ] = arguments[ len ];

                    var source = handlerFn.source;
                    var selector = source.selector;
                    var subject = source.subject;
                    if (selector) {
                        var result = tryCatch(selector).apply(this, innerArgs);
                        if (result === errorObject) {
                            subject.error(errorObject.e);
                        }
                        else {
                            subject.next(result);
                            subject.complete();
                        }
                    }
                    else {
                        subject.next(innerArgs.length === 1 ? innerArgs[0] : innerArgs);
                        subject.complete();
                    }
                };
                // use named function instance to avoid closure.
                handler.source = this;
                var result = tryCatch(callbackFunc).apply(this, args.concat(handler));
                if (result === errorObject) {
                    subject.error(errorObject.e);
                }
            }
            return subject.subscribe(subscriber);
        }
        else {
            return scheduler.schedule(BoundCallbackObservable.dispatch, 0, { source: this, subscriber: subscriber });
        }
    };
    BoundCallbackObservable.dispatch = function dispatch (state) {
        var self = this;
        var source = state.source;
        var subscriber = state.subscriber;
        var callbackFunc = source.callbackFunc;
        var args = source.args;
        var scheduler = source.scheduler;
        var subject = source.subject;
        if (!subject) {
            subject = source.subject = new AsyncSubject();
            var handler = function handlerFn() {
                var innerArgs = [], len = arguments.length;
                while ( len-- ) innerArgs[ len ] = arguments[ len ];

                var source = handlerFn.source;
                var selector = source.selector;
                var subject = source.subject;
                if (selector) {
                    var result = tryCatch(selector).apply(this, innerArgs);
                    if (result === errorObject) {
                        self.add(scheduler.schedule(dispatchError, 0, { err: errorObject.e, subject: subject }));
                    }
                    else {
                        self.add(scheduler.schedule(dispatchNext, 0, { value: result, subject: subject }));
                    }
                }
                else {
                    var value = innerArgs.length === 1 ? innerArgs[0] : innerArgs;
                    self.add(scheduler.schedule(dispatchNext, 0, { value: value, subject: subject }));
                }
            };
            // use named function to pass values in without closure
            handler.source = source;
            var result = tryCatch(callbackFunc).apply(this, args.concat(handler));
            if (result === errorObject) {
                subject.error(errorObject.e);
            }
        }
        self.add(subject.subscribe(subscriber));
    };

    return BoundCallbackObservable;
}(Observable));
function dispatchNext(arg) {
    var value = arg.value;
    var subject = arg.subject;
    subject.next(value);
    subject.complete();
}
function dispatchError(arg) {
    var err = arg.err;
    var subject = arg.subject;
    subject.error(err);
}

var bindCallback = BoundCallbackObservable.create;

Observable.bindCallback = bindCallback;

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var BoundNodeCallbackObservable = (function (Observable$$1) {
    function BoundNodeCallbackObservable(callbackFunc, selector, args, scheduler) {
        Observable$$1.call(this);
        this.callbackFunc = callbackFunc;
        this.selector = selector;
        this.args = args;
        this.scheduler = scheduler;
    }

    if ( Observable$$1 ) BoundNodeCallbackObservable.__proto__ = Observable$$1;
    BoundNodeCallbackObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    BoundNodeCallbackObservable.prototype.constructor = BoundNodeCallbackObservable;
    /* tslint:enable:max-line-length */
    /**
     * Converts a Node.js-style callback API to a function that returns an
     * Observable.
     *
     * <span class="informal">It's just like {@link bindCallback}, but the
     * callback is expected to be of type `callback(error, result)`.</span>
     *
     * `bindNodeCallback` is not an operator because its input and output are not
     * Observables. The input is a function `func` with some parameters, but the
     * last parameter must be a callback function that `func` calls when it is
     * done. The callback function is expected to follow Node.js conventions,
     * where the first argument to the callback is an error, while remaining
     * arguments are the callback result. The output of `bindNodeCallback` is a
     * function that takes the same parameters as `func`, except the last one (the
     * callback). When the output function is called with arguments, it will
     * return an Observable where the results will be delivered to.
     *
     * @example <caption>Read a file from the filesystem and get the data as an Observable</caption>
     * import * as fs from 'fs';
     * var readFileAsObservable = Rx.Observable.bindNodeCallback(fs.readFile);
     * var result = readFileAsObservable('./roadNames.txt', 'utf8');
     * result.subscribe(x => console.log(x), e => console.error(e));
     *
     * @see {@link bindCallback}
     * @see {@link from}
     * @see {@link fromPromise}
     *
     * @param {function} func Function with a callback as the last parameter.
     * @param {function} selector A function which takes the arguments from the
     * callback and maps those a value to emit on the output Observable.
     * @param {Scheduler} [scheduler] The scheduler on which to schedule the
     * callbacks.
     * @return {function(...params: *): Observable} A function which returns the
     * Observable that delivers the same values the Node.js callback would
     * deliver.
     * @static true
     * @name bindNodeCallback
     * @owner Observable
     */
    BoundNodeCallbackObservable.create = function create (func, selector, scheduler) {
        if ( selector === void 0 ) selector = undefined;

        return function () {
            var args = [], len = arguments.length;
            while ( len-- ) args[ len ] = arguments[ len ];

            return new BoundNodeCallbackObservable(func, selector, args, scheduler);
        };
    };
    BoundNodeCallbackObservable.prototype._subscribe = function _subscribe (subscriber) {
        var callbackFunc = this.callbackFunc;
        var args = this.args;
        var scheduler = this.scheduler;
        var subject = this.subject;
        if (!scheduler) {
            if (!subject) {
                subject = this.subject = new AsyncSubject();
                var handler = function handlerFn() {
                    var innerArgs = [], len = arguments.length;
                    while ( len-- ) innerArgs[ len ] = arguments[ len ];

                    var source = handlerFn.source;
                    var selector = source.selector;
                    var subject = source.subject;
                    var err = innerArgs.shift();
                    if (err) {
                        subject.error(err);
                    }
                    else if (selector) {
                        var result = tryCatch(selector).apply(this, innerArgs);
                        if (result === errorObject) {
                            subject.error(errorObject.e);
                        }
                        else {
                            subject.next(result);
                            subject.complete();
                        }
                    }
                    else {
                        subject.next(innerArgs.length === 1 ? innerArgs[0] : innerArgs);
                        subject.complete();
                    }
                };
                // use named function instance to avoid closure.
                handler.source = this;
                var result = tryCatch(callbackFunc).apply(this, args.concat(handler));
                if (result === errorObject) {
                    subject.error(errorObject.e);
                }
            }
            return subject.subscribe(subscriber);
        }
        else {
            return scheduler.schedule(dispatch$1, 0, { source: this, subscriber: subscriber });
        }
    };

    return BoundNodeCallbackObservable;
}(Observable));
function dispatch$1(state) {
    var self = this;
    var source = state.source;
    var subscriber = state.subscriber;
    // XXX: cast to `any` to access to the private field in `source`.
    var callbackFunc = source.callbackFunc;
    var args = source.args;
    var scheduler = source.scheduler;
    var subject = source.subject;
    if (!subject) {
        subject = source.subject = new AsyncSubject();
        var handler = function handlerFn() {
            var innerArgs = [], len = arguments.length;
            while ( len-- ) innerArgs[ len ] = arguments[ len ];

            var source = handlerFn.source;
            var selector = source.selector;
            var subject = source.subject;
            var err = innerArgs.shift();
            if (err) {
                subject.error(err);
            }
            else if (selector) {
                var result = tryCatch(selector).apply(this, innerArgs);
                if (result === errorObject) {
                    self.add(scheduler.schedule(dispatchError$1, 0, { err: errorObject.e, subject: subject }));
                }
                else {
                    self.add(scheduler.schedule(dispatchNext$1, 0, { value: result, subject: subject }));
                }
            }
            else {
                var value = innerArgs.length === 1 ? innerArgs[0] : innerArgs;
                self.add(scheduler.schedule(dispatchNext$1, 0, { value: value, subject: subject }));
            }
        };
        // use named function to pass values in without closure
        handler.source = source;
        var result = tryCatch(callbackFunc).apply(this, args.concat(handler));
        if (result === errorObject) {
            subject.error(errorObject.e);
        }
    }
    self.add(subject.subscribe(subscriber));
}
function dispatchNext$1(arg) {
    var value = arg.value;
    var subject = arg.subject;
    subject.next(value);
    subject.complete();
}
function dispatchError$1(arg) {
    var err = arg.err;
    var subject = arg.subject;
    subject.error(err);
}

var bindNodeCallback = BoundNodeCallbackObservable.create;

Observable.bindNodeCallback = bindNodeCallback;

function isScheduler(value) {
    return value && typeof value.schedule === 'function';
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var ScalarObservable = (function (Observable$$1) {
    function ScalarObservable(value, scheduler) {
        Observable$$1.call(this);
        this.value = value;
        this.scheduler = scheduler;
        this._isScalar = true;
        if (scheduler) {
            this._isScalar = false;
        }
    }

    if ( Observable$$1 ) ScalarObservable.__proto__ = Observable$$1;
    ScalarObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    ScalarObservable.prototype.constructor = ScalarObservable;
    ScalarObservable.create = function create (value, scheduler) {
        return new ScalarObservable(value, scheduler);
    };
    ScalarObservable.dispatch = function dispatch (state) {
        var done = state.done;
        var value = state.value;
        var subscriber = state.subscriber;
        if (done) {
            subscriber.complete();
            return;
        }
        subscriber.next(value);
        if (subscriber.closed) {
            return;
        }
        state.done = true;
        this.schedule(state);
    };
    ScalarObservable.prototype._subscribe = function _subscribe (subscriber) {
        var value = this.value;
        var scheduler = this.scheduler;
        if (scheduler) {
            return scheduler.schedule(ScalarObservable.dispatch, 0, {
                done: false, value: value, subscriber: subscriber
            });
        }
        else {
            subscriber.next(value);
            if (!subscriber.closed) {
                subscriber.complete();
            }
        }
    };

    return ScalarObservable;
}(Observable));

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var EmptyObservable = (function (Observable$$1) {
    function EmptyObservable(scheduler) {
        Observable$$1.call(this);
        this.scheduler = scheduler;
    }

    if ( Observable$$1 ) EmptyObservable.__proto__ = Observable$$1;
    EmptyObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    EmptyObservable.prototype.constructor = EmptyObservable;
    /**
     * Creates an Observable that emits no items to the Observer and immediately
     * emits a complete notification.
     *
     * <span class="informal">Just emits 'complete', and nothing else.
     * </span>
     *
     * <img src="./img/empty.png" width="100%">
     *
     * This static operator is useful for creating a simple Observable that only
     * emits the complete notification. It can be used for composing with other
     * Observables, such as in a {@link mergeMap}.
     *
     * @example <caption>Emit the number 7, then complete.</caption>
     * var result = Rx.Observable.empty().startWith(7);
     * result.subscribe(x => console.log(x));
     *
     * @example <caption>Map and flatten only odd numbers to the sequence 'a', 'b', 'c'</caption>
     * var interval = Rx.Observable.interval(1000);
     * var result = interval.mergeMap(x =>
     *   x % 2 === 1 ? Rx.Observable.of('a', 'b', 'c') : Rx.Observable.empty()
     * );
     * result.subscribe(x => console.log(x));
     *
     * @see {@link create}
     * @see {@link never}
     * @see {@link of}
     * @see {@link throw}
     *
     * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
     * the emission of the complete notification.
     * @return {Observable} An "empty" Observable: emits only the complete
     * notification.
     * @static true
     * @name empty
     * @owner Observable
     */
    EmptyObservable.create = function create (scheduler) {
        return new EmptyObservable(scheduler);
    };
    EmptyObservable.dispatch = function dispatch (arg) {
        var subscriber = arg.subscriber;
        subscriber.complete();
    };
    EmptyObservable.prototype._subscribe = function _subscribe (subscriber) {
        var scheduler = this.scheduler;
        if (scheduler) {
            return scheduler.schedule(EmptyObservable.dispatch, 0, { subscriber: subscriber });
        }
        else {
            subscriber.complete();
        }
    };

    return EmptyObservable;
}(Observable));

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var ArrayObservable = (function (Observable$$1) {
    function ArrayObservable(array, scheduler) {
        Observable$$1.call(this);
        this.array = array;
        this.scheduler = scheduler;
        if (!scheduler && array.length === 1) {
            this._isScalar = true;
            this.value = array[0];
        }
    }

    if ( Observable$$1 ) ArrayObservable.__proto__ = Observable$$1;
    ArrayObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    ArrayObservable.prototype.constructor = ArrayObservable;
    ArrayObservable.create = function create (array, scheduler) {
        return new ArrayObservable(array, scheduler);
    };
    /**
     * Creates an Observable that emits some values you specify as arguments,
     * immediately one after the other, and then emits a complete notification.
     *
     * <span class="informal">Emits the arguments you provide, then completes.
     * </span>
     *
     * <img src="./img/of.png" width="100%">
     *
     * This static operator is useful for creating a simple Observable that only
     * emits the arguments given, and the complete notification thereafter. It can
     * be used for composing with other Observables, such as with {@link concat}.
     * By default, it uses a `null` Scheduler, which means the `next`
     * notifications are sent synchronously, although with a different Scheduler
     * it is possible to determine when those notifications will be delivered.
     *
     * @example <caption>Emit 10, 20, 30, then 'a', 'b', 'c', then start ticking every second.</caption>
     * var numbers = Rx.Observable.of(10, 20, 30);
     * var letters = Rx.Observable.of('a', 'b', 'c');
     * var interval = Rx.Observable.interval(1000);
     * var result = numbers.concat(letters).concat(interval);
     * result.subscribe(x => console.log(x));
     *
     * @see {@link create}
     * @see {@link empty}
     * @see {@link never}
     * @see {@link throw}
     *
     * @param {...T} values Arguments that represent `next` values to be emitted.
     * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
     * the emissions of the `next` notifications.
     * @return {Observable<T>} An Observable that emits each given input value.
     * @static true
     * @name of
     * @owner Observable
     */
    ArrayObservable.of = function of () {
        var array = [], len$1 = arguments.length;
        while ( len$1-- ) array[ len$1 ] = arguments[ len$1 ];

        var scheduler = array[array.length - 1];
        if (isScheduler(scheduler)) {
            array.pop();
        }
        else {
            scheduler = null;
        }
        var len = array.length;
        if (len > 1) {
            return new ArrayObservable(array, scheduler);
        }
        else if (len === 1) {
            return new ScalarObservable(array[0], scheduler);
        }
        else {
            return new EmptyObservable(scheduler);
        }
    };
    ArrayObservable.dispatch = function dispatch (state) {
        var array = state.array;
        var index = state.index;
        var count = state.count;
        var subscriber = state.subscriber;
        if (index >= count) {
            subscriber.complete();
            return;
        }
        subscriber.next(array[index]);
        if (subscriber.closed) {
            return;
        }
        state.index = index + 1;
        this.schedule(state);
    };
    ArrayObservable.prototype._subscribe = function _subscribe (subscriber) {
        var index = 0;
        var array = this.array;
        var count = array.length;
        var scheduler = this.scheduler;
        if (scheduler) {
            return scheduler.schedule(ArrayObservable.dispatch, 0, {
                array: array, index: index, count: count, subscriber: subscriber
            });
        }
        else {
            for (var i = 0; i < count && !subscriber.closed; i++) {
                subscriber.next(array[i]);
            }
            subscriber.complete();
        }
    };

    return ArrayObservable;
}(Observable));

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var OuterSubscriber = (function (Subscriber$$1) {
    function OuterSubscriber () {
        Subscriber$$1.apply(this, arguments);
    }

    if ( Subscriber$$1 ) OuterSubscriber.__proto__ = Subscriber$$1;
    OuterSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    OuterSubscriber.prototype.constructor = OuterSubscriber;

    OuterSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.destination.next(innerValue);
    };
    OuterSubscriber.prototype.notifyError = function notifyError (error, innerSub) {
        this.destination.error(error);
    };
    OuterSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        this.destination.complete();
    };

    return OuterSubscriber;
}(Subscriber));

function isPromise(value) {
    return value && typeof value.subscribe !== 'function' && typeof value.then === 'function';
}

var $$iterator;
var Symbol$2 = root.Symbol;
if (typeof Symbol$2 === 'function') {
    if (Symbol$2.iterator) {
        $$iterator = Symbol$2.iterator;
    }
    else if (typeof Symbol$2.for === 'function') {
        $$iterator = Symbol$2.for('iterator');
    }
}
else {
    if (root.Set && typeof new root.Set()['@@iterator'] === 'function') {
        // Bug for mozilla version
        $$iterator = '@@iterator';
    }
    else if (root.Map) {
        // es6-shim specific logic
        var keys = Object.getOwnPropertyNames(root.Map.prototype);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (key !== 'entries' && key !== 'size' && root.Map.prototype[key] === root.Map.prototype['entries']) {
                $$iterator = key;
                break;
            }
        }
    }
    else {
        $$iterator = '@@iterator';
    }
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var InnerSubscriber = (function (Subscriber$$1) {
    function InnerSubscriber(parent, outerValue, outerIndex) {
        Subscriber$$1.call(this);
        this.parent = parent;
        this.outerValue = outerValue;
        this.outerIndex = outerIndex;
        this.index = 0;
    }

    if ( Subscriber$$1 ) InnerSubscriber.__proto__ = Subscriber$$1;
    InnerSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    InnerSubscriber.prototype.constructor = InnerSubscriber;
    InnerSubscriber.prototype._next = function _next (value) {
        this.parent.notifyNext(this.outerValue, value, this.outerIndex, this.index++, this);
    };
    InnerSubscriber.prototype._error = function _error (error) {
        this.parent.notifyError(error, this);
        this.unsubscribe();
    };
    InnerSubscriber.prototype._complete = function _complete () {
        this.parent.notifyComplete(this);
        this.unsubscribe();
    };

    return InnerSubscriber;
}(Subscriber));

function subscribeToResult(outerSubscriber, result, outerValue, outerIndex) {
    var destination = new InnerSubscriber(outerSubscriber, outerValue, outerIndex);
    if (destination.closed) {
        return null;
    }
    if (result instanceof Observable) {
        if (result._isScalar) {
            destination.next(result.value);
            destination.complete();
            return null;
        }
        else {
            return result.subscribe(destination);
        }
    }
    if (isArray(result)) {
        for (var i = 0, len = result.length; i < len && !destination.closed; i++) {
            destination.next(result[i]);
        }
        if (!destination.closed) {
            destination.complete();
        }
    }
    else if (isPromise(result)) {
        result.then(function (value) {
            if (!destination.closed) {
                destination.next(value);
                destination.complete();
            }
        }, function (err) { return destination.error(err); })
            .then(null, function (err) {
            // Escaping the Promise trap: globally throw unhandled errors
            root.setTimeout(function () { throw err; });
        });
        return destination;
    }
    else if (typeof result[$$iterator] === 'function') {
        var iterator = result[$$iterator]();
        do {
            var item = iterator.next();
            if (item.done) {
                destination.complete();
                break;
            }
            destination.next(item.value);
            if (destination.closed) {
                break;
            }
        } while (true);
    }
    else if (typeof result[$$observable] === 'function') {
        var obs = result[$$observable]();
        if (typeof obs.subscribe !== 'function') {
            destination.error(new Error('invalid observable'));
        }
        else {
            return obs.subscribe(new InnerSubscriber(outerSubscriber, outerValue, outerIndex));
        }
    }
    else {
        destination.error(new TypeError('unknown type returned'));
    }
    return null;
}

var none = {};
/**
 * Combines multiple Observables to create an Observable whose values are
 * calculated from the latest values of each of its input Observables.
 *
 * <span class="informal">Whenever any input Observable emits a value, it
 * computes a formula using the latest values from all the inputs, then emits
 * the output of that formula.</span>
 *
 * <img src="./img/combineLatest.png" width="100%">
 *
 * `combineLatest` combines the values from this Observable with values from
 * Observables passed as arguments. This is done by subscribing to each
 * Observable, in order, and collecting an array of each of the most recent
 * values any time any of the input Observables emits, then either taking that
 * array and passing it as arguments to an optional `project` function and
 * emitting the return value of that, or just emitting the array of recent
 * values directly if there is no `project` function.
 *
 * @example <caption>Dynamically calculate the Body-Mass Index from an Observable of weight and one for height</caption>
 * var weight = Rx.Observable.of(70, 72, 76, 79, 75);
 * var height = Rx.Observable.of(1.76, 1.77, 1.78);
 * var bmi = weight.combineLatest(height, (w, h) => w / (h * h));
 * bmi.subscribe(x => console.log('BMI is ' + x));
 *
 * @see {@link combineAll}
 * @see {@link merge}
 * @see {@link withLatestFrom}
 *
 * @param {Observable} other An input Observable to combine with the source
 * Observable. More than one input Observables may be given as argument.
 * @param {function} [project] An optional function to project the values from
 * the combined latest values into a new value on the output Observable.
 * @return {Observable} An Observable of projected values from the most recent
 * values from each input Observable, or an array of the most recent values from
 * each input Observable.
 * @method combineLatest
 * @owner Observable
 */
function combineLatest$1() {
    var observables = [], len = arguments.length;
    while ( len-- ) observables[ len ] = arguments[ len ];

    var project = null;
    if (typeof observables[observables.length - 1] === 'function') {
        project = observables.pop();
    }
    // if the first and only other argument besides the resultSelector is an array
    // assume it's been called with `combineLatest([obs1, obs2, obs3], project)`
    if (observables.length === 1 && isArray(observables[0])) {
        observables = observables[0];
    }
    observables.unshift(this);
    return new ArrayObservable(observables).lift(new CombineLatestOperator(project));
}
/* tslint:enable:max-line-length */
var CombineLatestOperator = function CombineLatestOperator(project) {
    this.project = project;
};
CombineLatestOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new CombineLatestSubscriber(subscriber, this.project));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var CombineLatestSubscriber = (function (OuterSubscriber$$1) {
    function CombineLatestSubscriber(destination, project) {
        OuterSubscriber$$1.call(this, destination);
        this.project = project;
        this.active = 0;
        this.values = [];
        this.observables = [];
    }

    if ( OuterSubscriber$$1 ) CombineLatestSubscriber.__proto__ = OuterSubscriber$$1;
    CombineLatestSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    CombineLatestSubscriber.prototype.constructor = CombineLatestSubscriber;
    CombineLatestSubscriber.prototype._next = function _next (observable) {
        this.values.push(none);
        this.observables.push(observable);
    };
    CombineLatestSubscriber.prototype._complete = function _complete () {
        var this$1 = this;

        var observables = this.observables;
        var len = observables.length;
        if (len === 0) {
            this.destination.complete();
        }
        else {
            this.active = len;
            this.toRespond = len;
            for (var i = 0; i < len; i++) {
                var observable = observables[i];
                this$1.add(subscribeToResult(this$1, observable, observable, i));
            }
        }
    };
    CombineLatestSubscriber.prototype.notifyComplete = function notifyComplete (unused) {
        if ((this.active -= 1) === 0) {
            this.destination.complete();
        }
    };
    CombineLatestSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        var values = this.values;
        var oldVal = values[outerIndex];
        var toRespond = !this.toRespond
            ? 0
            : oldVal === none ? --this.toRespond : this.toRespond;
        values[outerIndex] = innerValue;
        if (toRespond === 0) {
            if (this.project) {
                this._tryProject(values);
            }
            else {
                this.destination.next(values.slice());
            }
        }
    };
    CombineLatestSubscriber.prototype._tryProject = function _tryProject (values) {
        var result;
        try {
            result = this.project.apply(this, values);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.destination.next(result);
    };

    return CombineLatestSubscriber;
}(OuterSubscriber));

/* tslint:enable:max-line-length */
/**
 * Combines multiple Observables to create an Observable whose values are
 * calculated from the latest values of each of its input Observables.
 *
 * <span class="informal">Whenever any input Observable emits a value, it
 * computes a formula using the latest values from all the inputs, then emits
 * the output of that formula.</span>
 *
 * <img src="./img/combineLatest.png" width="100%">
 *
 * `combineLatest` combines the values from all the Observables passed as
 * arguments. This is done by subscribing to each Observable, in order, and
 * collecting an array of each of the most recent values any time any of the
 * input Observables emits, then either taking that array and passing it as
 * arguments to an optional `project` function and emitting the return value of
 * that, or just emitting the array of recent values directly if there is no
 * `project` function.
 *
 * @example <caption>Dynamically calculate the Body-Mass Index from an Observable of weight and one for height</caption>
 * var weight = Rx.Observable.of(70, 72, 76, 79, 75);
 * var height = Rx.Observable.of(1.76, 1.77, 1.78);
 * var bmi = Rx.Observable.combineLatest(weight, height, (w, h) => w / (h * h));
 * bmi.subscribe(x => console.log('BMI is ' + x));
 *
 * @see {@link combineAll}
 * @see {@link merge}
 * @see {@link withLatestFrom}
 *
 * @param {Observable} observable1 An input Observable to combine with the
 * source Observable.
 * @param {Observable} observable2 An input Observable to combine with the
 * source Observable. More than one input Observables may be given as argument.
 * @param {function} [project] An optional function to project the values from
 * the combined latest values into a new value on the output Observable.
 * @param {Scheduler} [scheduler=null] The Scheduler to use for subscribing to
 * each input Observable.
 * @return {Observable} An Observable of projected values from the most recent
 * values from each input Observable, or an array of the most recent values from
 * each input Observable.
 * @static true
 * @name combineLatest
 * @owner Observable
 */
function combineLatest$$1() {
    var observables = [], len = arguments.length;
    while ( len-- ) observables[ len ] = arguments[ len ];

    var project = null;
    var scheduler = null;
    if (isScheduler(observables[observables.length - 1])) {
        scheduler = observables.pop();
    }
    if (typeof observables[observables.length - 1] === 'function') {
        project = observables.pop();
    }
    // if the first and only other argument besides the resultSelector is an array
    // assume it's been called with `combineLatest([obs1, obs2, obs3], project)`
    if (observables.length === 1 && isArray(observables[0])) {
        observables = observables[0];
    }
    return new ArrayObservable(observables, scheduler).lift(new CombineLatestOperator(project));
}

Observable.combineLatest = combineLatest$$1;

/**
 * Converts a higher-order Observable into a first-order Observable which
 * concurrently delivers all values that are emitted on the inner Observables.
 *
 * <span class="informal">Flattens an Observable-of-Observables.</span>
 *
 * <img src="./img/mergeAll.png" width="100%">
 *
 * `mergeAll` subscribes to an Observable that emits Observables, also known as
 * a higher-order Observable. Each time it observes one of these emitted inner
 * Observables, it subscribes to that and delivers all the values from the
 * inner Observable on the output Observable. The output Observable only
 * completes once all inner Observables have completed. Any error delivered by
 * a inner Observable will be immediately emitted on the output Observable.
 *
 * @example <caption>Spawn a new interval Observable for each click event, and blend their outputs as one Observable</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000));
 * var firstOrder = higherOrder.mergeAll();
 * firstOrder.subscribe(x => console.log(x));
 *
 * @example <caption>Count from 0 to 9 every second for each click, but only allow 2 concurrent timers</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000).take(10));
 * var firstOrder = higherOrder.mergeAll(2);
 * firstOrder.subscribe(x => console.log(x));
 *
 * @see {@link combineAll}
 * @see {@link concatAll}
 * @see {@link exhaust}
 * @see {@link merge}
 * @see {@link mergeMap}
 * @see {@link mergeMapTo}
 * @see {@link mergeScan}
 * @see {@link switch}
 * @see {@link zipAll}
 *
 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of inner
 * Observables being subscribed to concurrently.
 * @return {Observable} An Observable that emits values coming from all the
 * inner Observables emitted by the source Observable.
 * @method mergeAll
 * @owner Observable
 */
function mergeAll(concurrent) {
    if ( concurrent === void 0 ) concurrent = Number.POSITIVE_INFINITY;

    return this.lift(new MergeAllOperator(concurrent));
}
var MergeAllOperator = function MergeAllOperator(concurrent) {
    this.concurrent = concurrent;
};
MergeAllOperator.prototype.call = function call (observer, source) {
    return source._subscribe(new MergeAllSubscriber(observer, this.concurrent));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var MergeAllSubscriber = (function (OuterSubscriber$$1) {
    function MergeAllSubscriber(destination, concurrent) {
        OuterSubscriber$$1.call(this, destination);
        this.concurrent = concurrent;
        this.hasCompleted = false;
        this.buffer = [];
        this.active = 0;
    }

    if ( OuterSubscriber$$1 ) MergeAllSubscriber.__proto__ = OuterSubscriber$$1;
    MergeAllSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    MergeAllSubscriber.prototype.constructor = MergeAllSubscriber;
    MergeAllSubscriber.prototype._next = function _next (observable) {
        if (this.active < this.concurrent) {
            this.active++;
            this.add(subscribeToResult(this, observable));
        }
        else {
            this.buffer.push(observable);
        }
    };
    MergeAllSubscriber.prototype._complete = function _complete () {
        this.hasCompleted = true;
        if (this.active === 0 && this.buffer.length === 0) {
            this.destination.complete();
        }
    };
    MergeAllSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        var buffer = this.buffer;
        this.remove(innerSub);
        this.active--;
        if (buffer.length > 0) {
            this._next(buffer.shift());
        }
        else if (this.active === 0 && this.hasCompleted) {
            this.destination.complete();
        }
    };

    return MergeAllSubscriber;
}(OuterSubscriber));

/**
 * Creates an output Observable which sequentially emits all values from every
 * given input Observable after the current Observable.
 *
 * <span class="informal">Concatenates multiple Observables together by
 * sequentially emitting their values, one Observable after the other.</span>
 *
 * <img src="./img/concat.png" width="100%">
 *
 * Joins this Observable with multiple other Observables by subscribing to them
 * one at a time, starting with the source, and merging their results into the
 * output Observable. Will wait for each Observable to complete before moving
 * on to the next.
 *
 * @example <caption>Concatenate a timer counting from 0 to 3 with a synchronous sequence from 1 to 10</caption>
 * var timer = Rx.Observable.interval(1000).take(4);
 * var sequence = Rx.Observable.range(1, 10);
 * var result = timer.concat(sequence);
 * result.subscribe(x => console.log(x));
 *
 * @example <caption>Concatenate 3 Observables</caption>
 * var timer1 = Rx.Observable.interval(1000).take(10);
 * var timer2 = Rx.Observable.interval(2000).take(6);
 * var timer3 = Rx.Observable.interval(500).take(10);
 * var result = timer1.concat(timer2, timer3);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concatAll}
 * @see {@link concatMap}
 * @see {@link concatMapTo}
 *
 * @param {Observable} other An input Observable to concatenate after the source
 * Observable. More than one input Observables may be given as argument.
 * @param {Scheduler} [scheduler=null] An optional Scheduler to schedule each
 * Observable subscription on.
 * @return {Observable} All values of each passed Observable merged into a
 * single Observable, in order, in serial fashion.
 * @method concat
 * @owner Observable
 */
function concat$1() {
    var observables = [], len = arguments.length;
    while ( len-- ) observables[ len ] = arguments[ len ];

    return concatStatic.apply(void 0, [ this ].concat( observables ));
}
/* tslint:enable:max-line-length */
/**
 * Creates an output Observable which sequentially emits all values from every
 * given input Observable after the current Observable.
 *
 * <span class="informal">Concatenates multiple Observables together by
 * sequentially emitting their values, one Observable after the other.</span>
 *
 * <img src="./img/concat.png" width="100%">
 *
 * Joins multiple Observables together by subscribing to them one at a time and
 * merging their results into the output Observable. Will wait for each
 * Observable to complete before moving on to the next.
 *
 * @example <caption>Concatenate a timer counting from 0 to 3 with a synchronous sequence from 1 to 10</caption>
 * var timer = Rx.Observable.interval(1000).take(4);
 * var sequence = Rx.Observable.range(1, 10);
 * var result = Rx.Observable.concat(timer, sequence);
 * result.subscribe(x => console.log(x));
 *
 * @example <caption>Concatenate 3 Observables</caption>
 * var timer1 = Rx.Observable.interval(1000).take(10);
 * var timer2 = Rx.Observable.interval(2000).take(6);
 * var timer3 = Rx.Observable.interval(500).take(10);
 * var result = Rx.Observable.concat(timer1, timer2, timer3);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concatAll}
 * @see {@link concatMap}
 * @see {@link concatMapTo}
 *
 * @param {Observable} input1 An input Observable to concatenate with others.
 * @param {Observable} input2 An input Observable to concatenate with others.
 * More than one input Observables may be given as argument.
 * @param {Scheduler} [scheduler=null] An optional Scheduler to schedule each
 * Observable subscription on.
 * @return {Observable} All values of each passed Observable merged into a
 * single Observable, in order, in serial fashion.
 * @static true
 * @name concat
 * @owner Observable
 */
function concatStatic() {
    var observables = [], len = arguments.length;
    while ( len-- ) observables[ len ] = arguments[ len ];

    var scheduler = null;
    var args = observables;
    if (isScheduler(args[observables.length - 1])) {
        scheduler = args.pop();
    }
    return new ArrayObservable(observables, scheduler).lift(new MergeAllOperator(1));
}

var concat$$1 = concatStatic;

Observable.concat = concat$$1;

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var DeferObservable = (function (Observable$$1) {
    function DeferObservable(observableFactory) {
        Observable$$1.call(this);
        this.observableFactory = observableFactory;
    }

    if ( Observable$$1 ) DeferObservable.__proto__ = Observable$$1;
    DeferObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    DeferObservable.prototype.constructor = DeferObservable;
    /**
     * Creates an Observable that, on subscribe, calls an Observable factory to
     * make an Observable for each new Observer.
     *
     * <span class="informal">Creates the Observable lazily, that is, only when it
     * is subscribed.
     * </span>
     *
     * <img src="./img/defer.png" width="100%">
     *
     * `defer` allows you to create the Observable only when the Observer
     * subscribes, and create a fresh Observable for each Observer. It waits until
     * an Observer subscribes to it, and then it generates an Observable,
     * typically with an Observable factory function. It does this afresh for each
     * subscriber, so although each subscriber may think it is subscribing to the
     * same Observable, in fact each subscriber gets its own individual
     * Observable.
     *
     * @example <caption>Subscribe to either an Observable of clicks or an Observable of interval, at random</caption>
     * var clicksOrInterval = Rx.Observable.defer(function () {
     *   if (Math.random() > 0.5) {
     *     return Rx.Observable.fromEvent(document, 'click');
     *   } else {
     *     return Rx.Observable.interval(1000);
     *   }
     * });
     * clicksOrInterval.subscribe(x => console.log(x));
     *
     * @see {@link create}
     *
     * @param {function(): Observable|Promise} observableFactory The Observable
     * factory function to invoke for each Observer that subscribes to the output
     * Observable. May also return a Promise, which will be converted on the fly
     * to an Observable.
     * @return {Observable} An Observable whose Observers' subscriptions trigger
     * an invocation of the given Observable factory function.
     * @static true
     * @name defer
     * @owner Observable
     */
    DeferObservable.create = function create (observableFactory) {
        return new DeferObservable(observableFactory);
    };
    DeferObservable.prototype._subscribe = function _subscribe (subscriber) {
        return new DeferSubscriber(subscriber, this.observableFactory);
    };

    return DeferObservable;
}(Observable));
var DeferSubscriber = (function (OuterSubscriber$$1) {
    function DeferSubscriber(destination, factory) {
        OuterSubscriber$$1.call(this, destination);
        this.factory = factory;
        this.tryDefer();
    }

    if ( OuterSubscriber$$1 ) DeferSubscriber.__proto__ = OuterSubscriber$$1;
    DeferSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    DeferSubscriber.prototype.constructor = DeferSubscriber;
    DeferSubscriber.prototype.tryDefer = function tryDefer () {
        try {
            this._callFactory();
        }
        catch (err) {
            this._error(err);
        }
    };
    DeferSubscriber.prototype._callFactory = function _callFactory () {
        var result = this.factory();
        if (result) {
            this.add(subscribeToResult(this, result));
        }
    };

    return DeferSubscriber;
}(OuterSubscriber));

var defer = DeferObservable.create;

Observable.defer = defer;

var empty$1 = EmptyObservable.create;

Observable.empty = empty$1;

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var ForkJoinObservable = (function (Observable$$1) {
    function ForkJoinObservable(sources, resultSelector) {
        Observable$$1.call(this);
        this.sources = sources;
        this.resultSelector = resultSelector;
    }

    if ( Observable$$1 ) ForkJoinObservable.__proto__ = Observable$$1;
    ForkJoinObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    ForkJoinObservable.prototype.constructor = ForkJoinObservable;
    /* tslint:enable:max-line-length */
    /**
     * @param sources
     * @return {any}
     * @static true
     * @name forkJoin
     * @owner Observable
     */
    ForkJoinObservable.create = function create () {
        var sources = [], len = arguments.length;
        while ( len-- ) sources[ len ] = arguments[ len ];

        if (sources === null || arguments.length === 0) {
            return new EmptyObservable();
        }
        var resultSelector = null;
        if (typeof sources[sources.length - 1] === 'function') {
            resultSelector = sources.pop();
        }
        // if the first and only other argument besides the resultSelector is an array
        // assume it's been called with `forkJoin([obs1, obs2, obs3], resultSelector)`
        if (sources.length === 1 && isArray(sources[0])) {
            sources = sources[0];
        }
        if (sources.length === 0) {
            return new EmptyObservable();
        }
        return new ForkJoinObservable(sources, resultSelector);
    };
    ForkJoinObservable.prototype._subscribe = function _subscribe (subscriber) {
        return new ForkJoinSubscriber(subscriber, this.sources, this.resultSelector);
    };

    return ForkJoinObservable;
}(Observable));
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ForkJoinSubscriber = (function (OuterSubscriber$$1) {
    function ForkJoinSubscriber(destination, sources, resultSelector) {
        var this$1 = this;

        OuterSubscriber$$1.call(this, destination);
        this.sources = sources;
        this.resultSelector = resultSelector;
        this.completed = 0;
        this.haveValues = 0;
        var len = sources.length;
        this.total = len;
        this.values = new Array(len);
        for (var i = 0; i < len; i++) {
            var source = sources[i];
            var innerSubscription = subscribeToResult(this$1, source, null, i);
            if (innerSubscription) {
                innerSubscription.outerIndex = i;
                this$1.add(innerSubscription);
            }
        }
    }

    if ( OuterSubscriber$$1 ) ForkJoinSubscriber.__proto__ = OuterSubscriber$$1;
    ForkJoinSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    ForkJoinSubscriber.prototype.constructor = ForkJoinSubscriber;
    ForkJoinSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.values[outerIndex] = innerValue;
        if (!innerSub._hasValue) {
            innerSub._hasValue = true;
            this.haveValues++;
        }
    };
    ForkJoinSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        var destination = this.destination;
        var ref = this;
        var haveValues = ref.haveValues;
        var resultSelector = ref.resultSelector;
        var values = ref.values;
        var len = values.length;
        if (!innerSub._hasValue) {
            destination.complete();
            return;
        }
        this.completed++;
        if (this.completed !== len) {
            return;
        }
        if (haveValues === len) {
            var value = resultSelector ? resultSelector.apply(this, values) : values;
            destination.next(value);
        }
        destination.complete();
    };

    return ForkJoinSubscriber;
}(OuterSubscriber));

var forkJoin = ForkJoinObservable.create;

Observable.forkJoin = forkJoin;

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var PromiseObservable = (function (Observable$$1) {
    function PromiseObservable(promise, scheduler) {
        Observable$$1.call(this);
        this.promise = promise;
        this.scheduler = scheduler;
    }

    if ( Observable$$1 ) PromiseObservable.__proto__ = Observable$$1;
    PromiseObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    PromiseObservable.prototype.constructor = PromiseObservable;
    /**
     * Converts a Promise to an Observable.
     *
     * <span class="informal">Returns an Observable that just emits the Promise's
     * resolved value, then completes.</span>
     *
     * Converts an ES2015 Promise or a Promises/A+ spec compliant Promise to an
     * Observable. If the Promise resolves with a value, the output Observable
     * emits that resolved value as a `next`, and then completes. If the Promise
     * is rejected, then the output Observable emits the corresponding Error.
     *
     * @example <caption>Convert the Promise returned by Fetch to an Observable</caption>
     * var result = Rx.Observable.fromPromise(fetch('http://myserver.com/'));
     * result.subscribe(x => console.log(x), e => console.error(e));
     *
     * @see {@link bindCallback}
     * @see {@link from}
     *
     * @param {Promise<T>} promise The promise to be converted.
     * @param {Scheduler} [scheduler] An optional Scheduler to use for scheduling
     * the delivery of the resolved value (or the rejection).
     * @return {Observable<T>} An Observable which wraps the Promise.
     * @static true
     * @name fromPromise
     * @owner Observable
     */
    PromiseObservable.create = function create (promise, scheduler) {
        return new PromiseObservable(promise, scheduler);
    };
    PromiseObservable.prototype._subscribe = function _subscribe (subscriber) {
        var this$1 = this;

        var promise = this.promise;
        var scheduler = this.scheduler;
        if (scheduler == null) {
            if (this._isScalar) {
                if (!subscriber.closed) {
                    subscriber.next(this.value);
                    subscriber.complete();
                }
            }
            else {
                promise.then(function (value) {
                    this$1.value = value;
                    this$1._isScalar = true;
                    if (!subscriber.closed) {
                        subscriber.next(value);
                        subscriber.complete();
                    }
                }, function (err) {
                    if (!subscriber.closed) {
                        subscriber.error(err);
                    }
                })
                    .then(null, function (err) {
                    // escape the promise trap, throw unhandled errors
                    root.setTimeout(function () { throw err; });
                });
            }
        }
        else {
            if (this._isScalar) {
                if (!subscriber.closed) {
                    return scheduler.schedule(dispatchNext$2, 0, { value: this.value, subscriber: subscriber });
                }
            }
            else {
                promise.then(function (value) {
                    this$1.value = value;
                    this$1._isScalar = true;
                    if (!subscriber.closed) {
                        subscriber.add(scheduler.schedule(dispatchNext$2, 0, { value: value, subscriber: subscriber }));
                    }
                }, function (err) {
                    if (!subscriber.closed) {
                        subscriber.add(scheduler.schedule(dispatchError$2, 0, { err: err, subscriber: subscriber }));
                    }
                })
                    .then(null, function (err) {
                    // escape the promise trap, throw unhandled errors
                    root.setTimeout(function () { throw err; });
                });
            }
        }
    };

    return PromiseObservable;
}(Observable));
function dispatchNext$2(arg) {
    var value = arg.value;
    var subscriber = arg.subscriber;
    if (!subscriber.closed) {
        subscriber.next(value);
        subscriber.complete();
    }
}
function dispatchError$2(arg) {
    var err = arg.err;
    var subscriber = arg.subscriber;
    if (!subscriber.closed) {
        subscriber.error(err);
    }
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var IteratorObservable = (function (Observable$$1) {
    function IteratorObservable(iterator, scheduler) {
        Observable$$1.call(this);
        this.scheduler = scheduler;
        if (iterator == null) {
            throw new Error('iterator cannot be null.');
        }
        this.iterator = getIterator(iterator);
    }

    if ( Observable$$1 ) IteratorObservable.__proto__ = Observable$$1;
    IteratorObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    IteratorObservable.prototype.constructor = IteratorObservable;
    IteratorObservable.create = function create (iterator, scheduler) {
        return new IteratorObservable(iterator, scheduler);
    };
    IteratorObservable.dispatch = function dispatch (state) {
        var index = state.index;
        var hasError = state.hasError;
        var iterator = state.iterator;
        var subscriber = state.subscriber;
        if (hasError) {
            subscriber.error(state.error);
            return;
        }
        var result = iterator.next();
        if (result.done) {
            subscriber.complete();
            return;
        }
        subscriber.next(result.value);
        state.index = index + 1;
        if (subscriber.closed) {
            return;
        }
        this.schedule(state);
    };
    IteratorObservable.prototype._subscribe = function _subscribe (subscriber) {
        var index = 0;
        var ref = this;
        var iterator = ref.iterator;
        var scheduler = ref.scheduler;
        if (scheduler) {
            return scheduler.schedule(IteratorObservable.dispatch, 0, {
                index: index, iterator: iterator, subscriber: subscriber
            });
        }
        else {
            do {
                var result = iterator.next();
                if (result.done) {
                    subscriber.complete();
                    break;
                }
                else {
                    subscriber.next(result.value);
                }
                if (subscriber.closed) {
                    break;
                }
            } while (true);
        }
    };

    return IteratorObservable;
}(Observable));
var StringIterator = function StringIterator(str, idx, len) {
    if ( idx === void 0 ) idx = 0;
    if ( len === void 0 ) len = str.length;

    this.str = str;
    this.idx = idx;
    this.len = len;
};
StringIterator.prototype[$$iterator] = function () { return (this); };
StringIterator.prototype.next = function next () {
    return this.idx < this.len ? {
        done: false,
        value: this.str.charAt(this.idx++)
    } : {
        done: true,
        value: undefined
    };
};
var ArrayIterator = function ArrayIterator(arr, idx, len) {
    if ( idx === void 0 ) idx = 0;
    if ( len === void 0 ) len = toLength(arr);

    this.arr = arr;
    this.idx = idx;
    this.len = len;
};
ArrayIterator.prototype[$$iterator] = function () { return this; };
ArrayIterator.prototype.next = function next () {
    return this.idx < this.len ? {
        done: false,
        value: this.arr[this.idx++]
    } : {
        done: true,
        value: undefined
    };
};
function getIterator(obj) {
    var i = obj[$$iterator];
    if (!i && typeof obj === 'string') {
        return new StringIterator(obj);
    }
    if (!i && obj.length !== undefined) {
        return new ArrayIterator(obj);
    }
    if (!i) {
        throw new TypeError('object is not iterable');
    }
    return obj[$$iterator]();
}
var maxSafeInteger = Math.pow(2, 53) - 1;
function toLength(o) {
    var len = +o.length;
    if (isNaN(len)) {
        return 0;
    }
    if (len === 0 || !numberIsFinite(len)) {
        return len;
    }
    len = sign(len) * Math.floor(Math.abs(len));
    if (len <= 0) {
        return 0;
    }
    if (len > maxSafeInteger) {
        return maxSafeInteger;
    }
    return len;
}
function numberIsFinite(value) {
    return typeof value === 'number' && root.isFinite(value);
}
function sign(value) {
    var valueAsNumber = +value;
    if (valueAsNumber === 0) {
        return valueAsNumber;
    }
    if (isNaN(valueAsNumber)) {
        return valueAsNumber;
    }
    return valueAsNumber < 0 ? -1 : 1;
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var ArrayLikeObservable = (function (Observable$$1) {
    function ArrayLikeObservable(arrayLike, scheduler) {
        Observable$$1.call(this);
        this.arrayLike = arrayLike;
        this.scheduler = scheduler;
        if (!scheduler && arrayLike.length === 1) {
            this._isScalar = true;
            this.value = arrayLike[0];
        }
    }

    if ( Observable$$1 ) ArrayLikeObservable.__proto__ = Observable$$1;
    ArrayLikeObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    ArrayLikeObservable.prototype.constructor = ArrayLikeObservable;
    ArrayLikeObservable.create = function create (arrayLike, scheduler) {
        var length = arrayLike.length;
        if (length === 0) {
            return new EmptyObservable();
        }
        else if (length === 1) {
            return new ScalarObservable(arrayLike[0], scheduler);
        }
        else {
            return new ArrayLikeObservable(arrayLike, scheduler);
        }
    };
    ArrayLikeObservable.dispatch = function dispatch (state) {
        var arrayLike = state.arrayLike;
        var index = state.index;
        var length = state.length;
        var subscriber = state.subscriber;
        if (subscriber.closed) {
            return;
        }
        if (index >= length) {
            subscriber.complete();
            return;
        }
        subscriber.next(arrayLike[index]);
        state.index = index + 1;
        this.schedule(state);
    };
    ArrayLikeObservable.prototype._subscribe = function _subscribe (subscriber) {
        var index = 0;
        var ref = this;
        var arrayLike = ref.arrayLike;
        var scheduler = ref.scheduler;
        var length = arrayLike.length;
        if (scheduler) {
            return scheduler.schedule(ArrayLikeObservable.dispatch, 0, {
                arrayLike: arrayLike, index: index, length: length, subscriber: subscriber
            });
        }
        else {
            for (var i = 0; i < length && !subscriber.closed; i++) {
                subscriber.next(arrayLike[i]);
            }
            subscriber.complete();
        }
    };

    return ArrayLikeObservable;
}(Observable));

/**
 * Represents a push-based event or value that an {@link Observable} can emit.
 * This class is particularly useful for operators that manage notifications,
 * like {@link materialize}, {@link dematerialize}, {@link observeOn}, and
 * others. Besides wrapping the actual delivered value, it also annotates it
 * with metadata of, for instance, what type of push message it is (`next`,
 * `error`, or `complete`).
 *
 * @see {@link materialize}
 * @see {@link dematerialize}
 * @see {@link observeOn}
 *
 * @class Notification<T>
 */
var Notification = function Notification(kind, value, exception) {
    this.kind = kind;
    this.value = value;
    this.exception = exception;
    this.hasValue = kind === 'N';
};
/**
 * Delivers to the given `observer` the value wrapped by this Notification.
 * @param {Observer} observer
 * @return
 */
Notification.prototype.observe = function observe (observer) {
    switch (this.kind) {
        case 'N':
            return observer.next && observer.next(this.value);
        case 'E':
            return observer.error && observer.error(this.exception);
        case 'C':
            return observer.complete && observer.complete();
    }
};
/**
 * Given some {@link Observer} callbacks, deliver the value represented by the
 * current Notification to the correctly corresponding callback.
 * @param {function(value: T): void} next An Observer `next` callback.
 * @param {function(err: any): void} [error] An Observer `error` callback.
 * @param {function(): void} [complete] An Observer `complete` callback.
 * @return {any}
 */
Notification.prototype.do = function do$1 (next, error, complete) {
    var kind = this.kind;
    switch (kind) {
        case 'N':
            return next && next(this.value);
        case 'E':
            return error && error(this.exception);
        case 'C':
            return complete && complete();
    }
};
/**
 * Takes an Observer or its individual callback functions, and calls `observe`
 * or `do` methods accordingly.
 * @param {Observer|function(value: T): void} nextOrObserver An Observer or
 * the `next` callback.
 * @param {function(err: any): void} [error] An Observer `error` callback.
 * @param {function(): void} [complete] An Observer `complete` callback.
 * @return {any}
 */
Notification.prototype.accept = function accept (nextOrObserver, error, complete) {
    if (nextOrObserver && typeof nextOrObserver.next === 'function') {
        return this.observe(nextOrObserver);
    }
    else {
        return this.do(nextOrObserver, error, complete);
    }
};
/**
 * Returns a simple Observable that just delivers the notification represented
 * by this Notification instance.
 * @return {any}
 */
Notification.prototype.toObservable = function toObservable () {
    var kind = this.kind;
    switch (kind) {
        case 'N':
            return Observable.of(this.value);
        case 'E':
            return Observable.throw(this.exception);
        case 'C':
            return Observable.empty();
    }
    throw new Error('unexpected notification kind value');
};
/**
 * A shortcut to create a Notification instance of the type `next` from a
 * given value.
 * @param {T} value The `next` value.
 * @return {Notification<T>} The "next" Notification representing the
 * argument.
 */
Notification.createNext = function createNext (value) {
    if (typeof value !== 'undefined') {
        return new Notification('N', value);
    }
    return this.undefinedValueNotification;
};
/**
 * A shortcut to create a Notification instance of the type `error` from a
 * given error.
 * @param {any} [err] The `error` exception.
 * @return {Notification<T>} The "error" Notification representing the
 * argument.
 */
Notification.createError = function createError (err) {
    return new Notification('E', undefined, err);
};
/**
 * A shortcut to create a Notification instance of the type `complete`.
 * @return {Notification<any>} The valueless "complete" Notification.
 */
Notification.createComplete = function createComplete () {
    return this.completeNotification;
};
Notification.completeNotification = new Notification('C');
Notification.undefinedValueNotification = new Notification('N', undefined);

/**
 * @see {@link Notification}
 *
 * @param scheduler
 * @param delay
 * @return {Observable<R>|WebSocketSubject<T>|Observable<T>}
 * @method observeOn
 * @owner Observable
 */
function observeOn(scheduler, delay) {
    if ( delay === void 0 ) delay = 0;

    return this.lift(new ObserveOnOperator(scheduler, delay));
}
var ObserveOnOperator = function ObserveOnOperator(scheduler, delay) {
    if ( delay === void 0 ) delay = 0;

    this.scheduler = scheduler;
    this.delay = delay;
};
ObserveOnOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new ObserveOnSubscriber(subscriber, this.scheduler, this.delay));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ObserveOnSubscriber = (function (Subscriber$$1) {
    function ObserveOnSubscriber(destination, scheduler, delay) {
        if ( delay === void 0 ) delay = 0;

        Subscriber$$1.call(this, destination);
        this.scheduler = scheduler;
        this.delay = delay;
    }

    if ( Subscriber$$1 ) ObserveOnSubscriber.__proto__ = Subscriber$$1;
    ObserveOnSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    ObserveOnSubscriber.prototype.constructor = ObserveOnSubscriber;
    ObserveOnSubscriber.dispatch = function dispatch (arg) {
        var notification = arg.notification;
        var destination = arg.destination;
        notification.observe(destination);
    };
    ObserveOnSubscriber.prototype.scheduleMessage = function scheduleMessage (notification) {
        this.add(this.scheduler.schedule(ObserveOnSubscriber.dispatch, this.delay, new ObserveOnMessage(notification, this.destination)));
    };
    ObserveOnSubscriber.prototype._next = function _next (value) {
        this.scheduleMessage(Notification.createNext(value));
    };
    ObserveOnSubscriber.prototype._error = function _error (err) {
        this.scheduleMessage(Notification.createError(err));
    };
    ObserveOnSubscriber.prototype._complete = function _complete () {
        this.scheduleMessage(Notification.createComplete());
    };

    return ObserveOnSubscriber;
}(Subscriber));
var ObserveOnMessage = function ObserveOnMessage(notification, destination) {
    this.notification = notification;
    this.destination = destination;
};

var isArrayLike = (function (x) { return x && typeof x.length === 'number'; });
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var FromObservable = (function (Observable$$1) {
    function FromObservable(ish, scheduler) {
        Observable$$1.call(this, null);
        this.ish = ish;
        this.scheduler = scheduler;
    }

    if ( Observable$$1 ) FromObservable.__proto__ = Observable$$1;
    FromObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    FromObservable.prototype.constructor = FromObservable;
    /**
     * Creates an Observable from an Array, an array-like object, a Promise, an
     * iterable object, or an Observable-like object.
     *
     * <span class="informal">Converts almost anything to an Observable.</span>
     *
     * <img src="./img/from.png" width="100%">
     *
     * Convert various other objects and data types into Observables. `from`
     * converts a Promise or an array-like or an
     * [iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#iterable)
     * object into an Observable that emits the items in that promise or array or
     * iterable. A String, in this context, is treated as an array of characters.
     * Observable-like objects (contains a function named with the ES2015 Symbol
     * for Observable) can also be converted through this operator.
     *
     * @example <caption>Converts an array to an Observable</caption>
     * var array = [10, 20, 30];
     * var result = Rx.Observable.from(array);
     * result.subscribe(x => console.log(x));
     *
     * @example <caption>Convert an infinite iterable (from a generator) to an Observable</caption>
     * function* generateDoubles(seed) {
     *   var i = seed;
     *   while (true) {
     *     yield i;
     *     i = 2 * i; // double it
     *   }
     * }
     *
     * var iterator = generateDoubles(3);
     * var result = Rx.Observable.from(iterator).take(10);
     * result.subscribe(x => console.log(x));
     *
     * @see {@link create}
     * @see {@link fromEvent}
     * @see {@link fromEventPattern}
     * @see {@link fromPromise}
     *
     * @param {ObservableInput<T>} ish A subscribable object, a Promise, an
     * Observable-like, an Array, an iterable or an array-like object to be
     * converted.
     * @param {Scheduler} [scheduler] The scheduler on which to schedule the
     * emissions of values.
     * @return {Observable<T>} The Observable whose values are originally from the
     * input object that was converted.
     * @static true
     * @name from
     * @owner Observable
     */
    FromObservable.create = function create (ish, scheduler) {
        if (ish != null) {
            if (typeof ish[$$observable] === 'function') {
                if (ish instanceof Observable$$1 && !scheduler) {
                    return ish;
                }
                return new FromObservable(ish, scheduler);
            }
            else if (isArray(ish)) {
                return new ArrayObservable(ish, scheduler);
            }
            else if (isPromise(ish)) {
                return new PromiseObservable(ish, scheduler);
            }
            else if (typeof ish[$$iterator] === 'function' || typeof ish === 'string') {
                return new IteratorObservable(ish, scheduler);
            }
            else if (isArrayLike(ish)) {
                return new ArrayLikeObservable(ish, scheduler);
            }
        }
        throw new TypeError((ish !== null && typeof ish || ish) + ' is not observable');
    };
    FromObservable.prototype._subscribe = function _subscribe (subscriber) {
        var ish = this.ish;
        var scheduler = this.scheduler;
        if (scheduler == null) {
            return ish[$$observable]().subscribe(subscriber);
        }
        else {
            return ish[$$observable]().subscribe(new ObserveOnSubscriber(subscriber, scheduler, 0));
        }
    };

    return FromObservable;
}(Observable));

var from = FromObservable.create;

Observable.from = from;

function isNodeStyleEventEmmitter(sourceObj) {
    return !!sourceObj && typeof sourceObj.addListener === 'function' && typeof sourceObj.removeListener === 'function';
}
function isJQueryStyleEventEmitter(sourceObj) {
    return !!sourceObj && typeof sourceObj.on === 'function' && typeof sourceObj.off === 'function';
}
function isNodeList(sourceObj) {
    return !!sourceObj && sourceObj.toString() === '[object NodeList]';
}
function isHTMLCollection(sourceObj) {
    return !!sourceObj && sourceObj.toString() === '[object HTMLCollection]';
}
function isEventTarget(sourceObj) {
    return !!sourceObj && typeof sourceObj.addEventListener === 'function' && typeof sourceObj.removeEventListener === 'function';
}
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var FromEventObservable = (function (Observable$$1) {
    function FromEventObservable(sourceObj, eventName, selector, options) {
        Observable$$1.call(this);
        this.sourceObj = sourceObj;
        this.eventName = eventName;
        this.selector = selector;
        this.options = options;
    }

    if ( Observable$$1 ) FromEventObservable.__proto__ = Observable$$1;
    FromEventObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    FromEventObservable.prototype.constructor = FromEventObservable;
    /* tslint:enable:max-line-length */
    /**
     * Creates an Observable that emits events of a specific type coming from the
     * given event target.
     *
     * <span class="informal">Creates an Observable from DOM events, or Node
     * EventEmitter events or others.</span>
     *
     * <img src="./img/fromEvent.png" width="100%">
     *
     * Creates an Observable by attaching an event listener to an "event target",
     * which may be an object with `addEventListener` and `removeEventListener`,
     * a Node.js EventEmitter, a jQuery style EventEmitter, a NodeList from the
     * DOM, or an HTMLCollection from the DOM. The event handler is attached when
     * the output Observable is subscribed, and removed when the Subscription is
     * unsubscribed.
     *
     * @example <caption>Emits clicks happening on the DOM document</caption>
     * var clicks = Rx.Observable.fromEvent(document, 'click');
     * clicks.subscribe(x => console.log(x));
     *
     * @see {@link from}
     * @see {@link fromEventPattern}
     *
     * @param {EventTargetLike} target The DOMElement, event target, Node.js
     * EventEmitter, NodeList or HTMLCollection to attach the event handler to.
     * @param {string} eventName The event name of interest, being emitted by the
     * `target`.
     * @parm {EventListenerOptions} [options] Options to pass through to addEventListener
     * @param {SelectorMethodSignature<T>} [selector] An optional function to
     * post-process results. It takes the arguments from the event handler and
     * should return a single value.
     * @return {Observable<T>}
     * @static true
     * @name fromEvent
     * @owner Observable
     */
    FromEventObservable.create = function create (target, eventName, options, selector) {
        if (isFunction(options)) {
            selector = options;
            options = undefined;
        }
        return new FromEventObservable(target, eventName, selector, options);
    };
    FromEventObservable.setupSubscription = function setupSubscription (sourceObj, eventName, handler, subscriber, options) {
        var unsubscribe;
        if (isNodeList(sourceObj) || isHTMLCollection(sourceObj)) {
            for (var i = 0, len = sourceObj.length; i < len; i++) {
                FromEventObservable.setupSubscription(sourceObj[i], eventName, handler, subscriber, options);
            }
        }
        else if (isEventTarget(sourceObj)) {
            var source = sourceObj;
            sourceObj.addEventListener(eventName, handler, options);
            unsubscribe = function () { return source.removeEventListener(eventName, handler); };
        }
        else if (isJQueryStyleEventEmitter(sourceObj)) {
            var source$1 = sourceObj;
            sourceObj.on(eventName, handler);
            unsubscribe = function () { return source$1.off(eventName, handler); };
        }
        else if (isNodeStyleEventEmmitter(sourceObj)) {
            var source$2 = sourceObj;
            sourceObj.addListener(eventName, handler);
            unsubscribe = function () { return source$2.removeListener(eventName, handler); };
        }
        subscriber.add(new Subscription(unsubscribe));
    };
    FromEventObservable.prototype._subscribe = function _subscribe (subscriber) {
        var sourceObj = this.sourceObj;
        var eventName = this.eventName;
        var options = this.options;
        var selector = this.selector;
        var handler = selector ? function () {
            var args = [], len = arguments.length;
            while ( len-- ) args[ len ] = arguments[ len ];

            var result = tryCatch(selector).apply(void 0, args);
            if (result === errorObject) {
                subscriber.error(errorObject.e);
            }
            else {
                subscriber.next(result);
            }
        } : function (e) { return subscriber.next(e); };
        FromEventObservable.setupSubscription(sourceObj, eventName, handler, subscriber, options);
    };

    return FromEventObservable;
}(Observable));

var fromEvent = FromEventObservable.create;

Observable.fromEvent = fromEvent;

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var FromEventPatternObservable = (function (Observable$$1) {
    function FromEventPatternObservable(addHandler, removeHandler, selector) {
        Observable$$1.call(this);
        this.addHandler = addHandler;
        this.removeHandler = removeHandler;
        this.selector = selector;
    }

    if ( Observable$$1 ) FromEventPatternObservable.__proto__ = Observable$$1;
    FromEventPatternObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    FromEventPatternObservable.prototype.constructor = FromEventPatternObservable;
    /**
     * Creates an Observable from an API based on addHandler/removeHandler
     * functions.
     *
     * <span class="informal">Converts any addHandler/removeHandler API to an
     * Observable.</span>
     *
     * <img src="./img/fromEventPattern.png" width="100%">
     *
     * Creates an Observable by using the `addHandler` and `removeHandler`
     * functions to add and remove the handlers, with an optional selector
     * function to project the event arguments to a result. The `addHandler` is
     * called when the output Observable is subscribed, and `removeHandler` is
     * called when the Subscription is unsubscribed.
     *
     * @example <caption>Emits clicks happening on the DOM document</caption>
     * function addClickHandler(handler) {
     *   document.addEventListener('click', handler);
     * }
     *
     * function removeClickHandler(handler) {
     *   document.removeEventListener('click', handler);
     * }
     *
     * var clicks = Rx.Observable.fromEventPattern(
     *   addClickHandler,
     *   removeClickHandler
     * );
     * clicks.subscribe(x => console.log(x));
     *
     * @see {@link from}
     * @see {@link fromEvent}
     *
     * @param {function(handler: Function): any} addHandler A function that takes
     * a `handler` function as argument and attaches it somehow to the actual
     * source of events.
     * @param {function(handler: Function): void} removeHandler A function that
     * takes a `handler` function as argument and removes it in case it was
     * previously attached using `addHandler`.
     * @param {function(...args: any): T} [selector] An optional function to
     * post-process results. It takes the arguments from the event handler and
     * should return a single value.
     * @return {Observable<T>}
     * @static true
     * @name fromEventPattern
     * @owner Observable
     */
    FromEventPatternObservable.create = function create (addHandler, removeHandler, selector) {
        return new FromEventPatternObservable(addHandler, removeHandler, selector);
    };
    FromEventPatternObservable.prototype._subscribe = function _subscribe (subscriber) {
        var this$1 = this;

        var removeHandler = this.removeHandler;
        var handler = !!this.selector ? function () {
            var args = [], len = arguments.length;
            while ( len-- ) args[ len ] = arguments[ len ];

            this$1._callSelector(subscriber, args);
        } : function (e) { subscriber.next(e); };
        this._callAddHandler(handler, subscriber);
        subscriber.add(new Subscription(function () {
            //TODO: determine whether or not to forward to error handler
            removeHandler(handler);
        }));
    };
    FromEventPatternObservable.prototype._callSelector = function _callSelector (subscriber, args) {
        try {
            var result = (ref = this).selector.apply(ref, args);
            subscriber.next(result);
        }
        catch (e) {
            subscriber.error(e);
        }
        var ref;
    };
    FromEventPatternObservable.prototype._callAddHandler = function _callAddHandler (handler, errorSubscriber) {
        try {
            this.addHandler(handler);
        }
        catch (e) {
            errorSubscriber.error(e);
        }
    };

    return FromEventPatternObservable;
}(Observable));

var fromEventPattern = FromEventPatternObservable.create;

Observable.fromEventPattern = fromEventPattern;

var fromPromise = PromiseObservable.create;

Observable.fromPromise = fromPromise;

var selfSelector = function (value) { return value; };
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var GenerateObservable = (function (Observable$$1) {
    function GenerateObservable(initialState, condition, iterate, resultSelector, scheduler) {
        Observable$$1.call(this);
        this.initialState = initialState;
        this.condition = condition;
        this.iterate = iterate;
        this.resultSelector = resultSelector;
        this.scheduler = scheduler;
    }

    if ( Observable$$1 ) GenerateObservable.__proto__ = Observable$$1;
    GenerateObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    GenerateObservable.prototype.constructor = GenerateObservable;
    GenerateObservable.create = function create (initialStateOrOptions, condition, iterate, resultSelectorOrObservable, scheduler) {
        if (arguments.length == 1) {
            return new GenerateObservable(initialStateOrOptions.initialState, initialStateOrOptions.condition, initialStateOrOptions.iterate, initialStateOrOptions.resultSelector || selfSelector, initialStateOrOptions.scheduler);
        }
        if (resultSelectorOrObservable === undefined || isScheduler(resultSelectorOrObservable)) {
            return new GenerateObservable(initialStateOrOptions, condition, iterate, selfSelector, resultSelectorOrObservable);
        }
        return new GenerateObservable(initialStateOrOptions, condition, iterate, resultSelectorOrObservable, scheduler);
    };
    GenerateObservable.prototype._subscribe = function _subscribe (subscriber) {
        var state = this.initialState;
        if (this.scheduler) {
            return this.scheduler.schedule(GenerateObservable.dispatch, 0, {
                subscriber: subscriber,
                iterate: this.iterate,
                condition: this.condition,
                resultSelector: this.resultSelector,
                state: state });
        }
        var ref = this;
        var condition = ref.condition;
        var resultSelector = ref.resultSelector;
        var iterate = ref.iterate;
        do {
            if (condition) {
                var conditionResult = (void 0);
                try {
                    conditionResult = condition(state);
                }
                catch (err) {
                    subscriber.error(err);
                    return;
                }
                if (!conditionResult) {
                    subscriber.complete();
                    break;
                }
            }
            var value = (void 0);
            try {
                value = resultSelector(state);
            }
            catch (err) {
                subscriber.error(err);
                return;
            }
            subscriber.next(value);
            if (subscriber.closed) {
                break;
            }
            try {
                state = iterate(state);
            }
            catch (err) {
                subscriber.error(err);
                return;
            }
        } while (true);
    };
    GenerateObservable.dispatch = function dispatch (state) {
        var subscriber = state.subscriber;
        var condition = state.condition;
        if (subscriber.closed) {
            return;
        }
        if (state.needIterate) {
            try {
                state.state = state.iterate(state.state);
            }
            catch (err) {
                subscriber.error(err);
                return;
            }
        }
        else {
            state.needIterate = true;
        }
        if (condition) {
            var conditionResult;
            try {
                conditionResult = condition(state.state);
            }
            catch (err) {
                subscriber.error(err);
                return;
            }
            if (!conditionResult) {
                subscriber.complete();
                return;
            }
            if (subscriber.closed) {
                return;
            }
        }
        var value;
        try {
            value = state.resultSelector(state.state);
        }
        catch (err) {
            subscriber.error(err);
            return;
        }
        if (subscriber.closed) {
            return;
        }
        subscriber.next(value);
        if (subscriber.closed) {
            return;
        }
        return this.schedule(state);
    };

    return GenerateObservable;
}(Observable));

Observable.generate = GenerateObservable.create;

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var IfObservable = (function (Observable$$1) {
    function IfObservable(condition, thenSource, elseSource) {
        Observable$$1.call(this);
        this.condition = condition;
        this.thenSource = thenSource;
        this.elseSource = elseSource;
    }

    if ( Observable$$1 ) IfObservable.__proto__ = Observable$$1;
    IfObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    IfObservable.prototype.constructor = IfObservable;
    IfObservable.create = function create (condition, thenSource, elseSource) {
        return new IfObservable(condition, thenSource, elseSource);
    };
    IfObservable.prototype._subscribe = function _subscribe (subscriber) {
        var ref = this;
        var condition = ref.condition;
        var thenSource = ref.thenSource;
        var elseSource = ref.elseSource;
        return new IfSubscriber(subscriber, condition, thenSource, elseSource);
    };

    return IfObservable;
}(Observable));
var IfSubscriber = (function (OuterSubscriber$$1) {
    function IfSubscriber(destination, condition, thenSource, elseSource) {
        OuterSubscriber$$1.call(this, destination);
        this.condition = condition;
        this.thenSource = thenSource;
        this.elseSource = elseSource;
        this.tryIf();
    }

    if ( OuterSubscriber$$1 ) IfSubscriber.__proto__ = OuterSubscriber$$1;
    IfSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    IfSubscriber.prototype.constructor = IfSubscriber;
    IfSubscriber.prototype.tryIf = function tryIf () {
        var ref = this;
        var condition = ref.condition;
        var thenSource = ref.thenSource;
        var elseSource = ref.elseSource;
        var result;
        try {
            result = condition();
            var source = result ? thenSource : elseSource;
            if (source) {
                this.add(subscribeToResult(this, source));
            }
            else {
                this._complete();
            }
        }
        catch (err) {
            this._error(err);
        }
    };

    return IfSubscriber;
}(OuterSubscriber));

var _if = IfObservable.create;

Observable.if = _if;

function isNumeric(val) {
    // parseFloat NaNs numeric-cast false positives (null|true|false|"")
    // ...but misinterprets leading-number strings, particularly hex literals ("0x...")
    // subtraction forces infinities to NaN
    // adding 1 corrects loss of precision from parseFloat (#15100)
    return !isArray(val) && (val - parseFloat(val) + 1) >= 0;
}

/**
 * A unit of work to be executed in a {@link Scheduler}. An action is typically
 * created from within a Scheduler and an RxJS user does not need to concern
 * themselves about creating and manipulating an Action.
 *
 * ```ts
 * class Action<T> extends Subscription {
 *   new (scheduler: Scheduler, work: (state?: T) => void);
 *   schedule(state?: T, delay: number = 0): Subscription;
 * }
 * ```
 *
 * @class Action<T>
 */
var Action = (function (Subscription$$1) {
    function Action(scheduler, work) {
        Subscription$$1.call(this);
    }

    if ( Subscription$$1 ) Action.__proto__ = Subscription$$1;
    Action.prototype = Object.create( Subscription$$1 && Subscription$$1.prototype );
    Action.prototype.constructor = Action;
    /**
     * Schedules this action on its parent Scheduler for execution. May be passed
     * some context object, `state`. May happen at some point in the future,
     * according to the `delay` parameter, if specified.
     * @param {T} [state] Some contextual data that the `work` function uses when
     * called by the Scheduler.
     * @param {number} [delay] Time to wait before executing the work, where the
     * time unit is implicit and defined by the Scheduler.
     * @return {void}
     */
    Action.prototype.schedule = function schedule (state, delay) {
        if ( delay === void 0 ) delay = 0;

        return this;
    };

    return Action;
}(Subscription));

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var AsyncAction = (function (Action$$1) {
    function AsyncAction(scheduler, work) {
        Action$$1.call(this, scheduler, work);
        this.scheduler = scheduler;
        this.work = work;
        this.pending = false;
    }

    if ( Action$$1 ) AsyncAction.__proto__ = Action$$1;
    AsyncAction.prototype = Object.create( Action$$1 && Action$$1.prototype );
    AsyncAction.prototype.constructor = AsyncAction;
    AsyncAction.prototype.schedule = function schedule (state, delay) {
        if ( delay === void 0 ) delay = 0;

        if (this.closed) {
            return this;
        }
        // Always replace the current state with the new state.
        this.state = state;
        // Set the pending flag indicating that this action has been scheduled, or
        // has recursively rescheduled itself.
        this.pending = true;
        var id = this.id;
        var scheduler = this.scheduler;
        //
        // Important implementation note:
        //
        // Actions only execute once by default, unless rescheduled from within the
        // scheduled callback. This allows us to implement single and repeat
        // actions via the same code path, without adding API surface area, as well
        // as mimic traditional recursion but across asynchronous boundaries.
        //
        // However, JS runtimes and timers distinguish between intervals achieved by
        // serial `setTimeout` calls vs. a single `setInterval` call. An interval of
        // serial `setTimeout` calls can be individually delayed, which delays
        // scheduling the next `setTimeout`, and so on. `setInterval` attempts to
        // guarantee the interval callback will be invoked more precisely to the
        // interval period, regardless of load.
        //
        // Therefore, we use `setInterval` to schedule single and repeat actions.
        // If the action reschedules itself with the same delay, the interval is not
        // canceled. If the action doesn't reschedule, or reschedules with a
        // different delay, the interval will be canceled after scheduled callback
        // execution.
        //
        if (id != null) {
            this.id = this.recycleAsyncId(scheduler, id, delay);
        }
        this.delay = delay;
        // If this action has already an async Id, don't request a new one.
        this.id = this.id || this.requestAsyncId(scheduler, this.id, delay);
        return this;
    };
    AsyncAction.prototype.requestAsyncId = function requestAsyncId (scheduler, id, delay) {
        if ( delay === void 0 ) delay = 0;

        return root.setInterval(scheduler.flush.bind(scheduler, this), delay);
    };
    AsyncAction.prototype.recycleAsyncId = function recycleAsyncId (scheduler, id, delay) {
        if ( delay === void 0 ) delay = 0;

        // If this action is rescheduled with the same delay time, don't clear the interval id.
        if (delay !== null && this.delay === delay) {
            return id;
        }
        // Otherwise, if the action's delay time is different from the current delay,
        // clear the interval id
        return root.clearInterval(id) && undefined || undefined;
    };
    /**
     * Immediately executes this action and the `work` it contains.
     * @return {any}
     */
    AsyncAction.prototype.execute = function execute (state, delay) {
        if (this.closed) {
            return new Error('executing a cancelled action');
        }
        this.pending = false;
        var error = this._execute(state, delay);
        if (error) {
            return error;
        }
        else if (this.pending === false && this.id != null) {
            // Dequeue if the action didn't reschedule itself. Don't call
            // unsubscribe(), because the action could reschedule later.
            // For example:
            // ```
            // scheduler.schedule(function doWork(counter) {
            //   /* ... I'm a busy worker bee ... */
            //   var originalAction = this;
            //   /* wait 100ms before rescheduling the action */
            //   setTimeout(function () {
            //     originalAction.schedule(counter + 1);
            //   }, 100);
            // }, 1000);
            // ```
            this.id = this.recycleAsyncId(this.scheduler, this.id, null);
        }
    };
    AsyncAction.prototype._execute = function _execute (state, delay) {
        var errored = false;
        var errorValue = undefined;
        try {
            this.work(state);
        }
        catch (e) {
            errored = true;
            errorValue = !!e && e || new Error(e);
        }
        if (errored) {
            this.unsubscribe();
            return errorValue;
        }
    };
    AsyncAction.prototype._unsubscribe = function _unsubscribe () {
        var id = this.id;
        var scheduler = this.scheduler;
        var actions = scheduler.actions;
        var index = actions.indexOf(this);
        this.work = null;
        this.delay = null;
        this.state = null;
        this.pending = false;
        this.scheduler = null;
        if (index !== -1) {
            actions.splice(index, 1);
        }
        if (id != null) {
            this.id = this.recycleAsyncId(scheduler, id, null);
        }
    };

    return AsyncAction;
}(Action));

/**
 * An execution context and a data structure to order tasks and schedule their
 * execution. Provides a notion of (potentially virtual) time, through the
 * `now()` getter method.
 *
 * Each unit of work in a Scheduler is called an {@link Action}.
 *
 * ```ts
 * class Scheduler {
 *   now(): number;
 *   schedule(work, delay?, state?): Subscription;
 * }
 * ```
 *
 * @class Scheduler
 */
var Scheduler$1 = function Scheduler$1(SchedulerAction, now) {
    if ( now === void 0 ) now = Scheduler$1.now;

    this.SchedulerAction = SchedulerAction;
    this.now = now;
};
/**
 * Schedules a function, `work`, for execution. May happen at some point in
 * the future, according to the `delay` parameter, if specified. May be passed
 * some context object, `state`, which will be passed to the `work` function.
 *
 * The given arguments will be processed an stored as an Action object in a
 * queue of actions.
 *
 * @param {function(state: ?T): ?Subscription} work A function representing a
 * task, or some unit of work to be executed by the Scheduler.
 * @param {number} [delay] Time to wait before executing the work, where the
 * time unit is implicit and defined by the Scheduler itself.
 * @param {T} [state] Some contextual data that the `work` function uses when
 * called by the Scheduler.
 * @return {Subscription} A subscription in order to be able to unsubscribe
 * the scheduled work.
 */
Scheduler$1.prototype.schedule = function schedule (work, delay, state) {
        if ( delay === void 0 ) delay = 0;

    return new this.SchedulerAction(this, work).schedule(state, delay);
};
Scheduler$1.now = Date.now ? Date.now : function () { return +new Date(); };

var AsyncScheduler = (function (Scheduler$$1) {
    function AsyncScheduler() {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        Scheduler$$1.apply(this, args);
        this.actions = [];
        /**
         * A flag to indicate whether the Scheduler is currently executing a batch of
         * queued actions.
         * @type {boolean}
         */
        this.active = false;
        /**
         * An internal ID used to track the latest asynchronous task such as those
         * coming from `setTimeout`, `setInterval`, `requestAnimationFrame`, and
         * others.
         * @type {any}
         */
        this.scheduled = undefined;
    }

    if ( Scheduler$$1 ) AsyncScheduler.__proto__ = Scheduler$$1;
    AsyncScheduler.prototype = Object.create( Scheduler$$1 && Scheduler$$1.prototype );
    AsyncScheduler.prototype.constructor = AsyncScheduler;
    AsyncScheduler.prototype.flush = function flush (action) {
        var ref = this;
        var actions = ref.actions;
        if (this.active) {
            actions.push(action);
            return;
        }
        var error;
        this.active = true;
        do {
            if (error = action.execute(action.state, action.delay)) {
                break;
            }
        } while (action = actions.shift()); // exhaust the scheduler queue
        this.active = false;
        if (error) {
            while (action = actions.shift()) {
                action.unsubscribe();
            }
            throw error;
        }
    };

    return AsyncScheduler;
}(Scheduler$1));

var async = new AsyncScheduler(AsyncAction);

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var IntervalObservable = (function (Observable$$1) {
    function IntervalObservable(period, scheduler) {
        if ( period === void 0 ) period = 0;
        if ( scheduler === void 0 ) scheduler = async;

        Observable$$1.call(this);
        this.period = period;
        this.scheduler = scheduler;
        if (!isNumeric(period) || period < 0) {
            this.period = 0;
        }
        if (!scheduler || typeof scheduler.schedule !== 'function') {
            this.scheduler = async;
        }
    }

    if ( Observable$$1 ) IntervalObservable.__proto__ = Observable$$1;
    IntervalObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    IntervalObservable.prototype.constructor = IntervalObservable;
    /**
     * Creates an Observable that emits sequential numbers every specified
     * interval of time, on a specified Scheduler.
     *
     * <span class="informal">Emits incremental numbers periodically in time.
     * </span>
     *
     * <img src="./img/interval.png" width="100%">
     *
     * `interval` returns an Observable that emits an infinite sequence of
     * ascending integers, with a constant interval of time of your choosing
     * between those emissions. The first emission is not sent immediately, but
     * only after the first period has passed. By default, this operator uses the
     * `async` Scheduler to provide a notion of time, but you may pass any
     * Scheduler to it.
     *
     * @example <caption>Emits ascending numbers, one every second (1000ms)</caption>
     * var numbers = Rx.Observable.interval(1000);
     * numbers.subscribe(x => console.log(x));
     *
     * @see {@link timer}
     * @see {@link delay}
     *
     * @param {number} [period=0] The interval size in milliseconds (by default)
     * or the time unit determined by the scheduler's clock.
     * @param {Scheduler} [scheduler=async] The Scheduler to use for scheduling
     * the emission of values, and providing a notion of "time".
     * @return {Observable} An Observable that emits a sequential number each time
     * interval.
     * @static true
     * @name interval
     * @owner Observable
     */
    IntervalObservable.create = function create (period, scheduler) {
        if ( period === void 0 ) period = 0;
        if ( scheduler === void 0 ) scheduler = async;

        return new IntervalObservable(period, scheduler);
    };
    IntervalObservable.dispatch = function dispatch (state) {
        var index = state.index;
        var subscriber = state.subscriber;
        var period = state.period;
        subscriber.next(index);
        if (subscriber.closed) {
            return;
        }
        state.index += 1;
        this.schedule(state, period);
    };
    IntervalObservable.prototype._subscribe = function _subscribe (subscriber) {
        var index = 0;
        var period = this.period;
        var scheduler = this.scheduler;
        subscriber.add(scheduler.schedule(IntervalObservable.dispatch, period, {
            index: index, subscriber: subscriber, period: period
        }));
    };

    return IntervalObservable;
}(Observable));

var interval = IntervalObservable.create;

Observable.interval = interval;

/**
 * Creates an output Observable which concurrently emits all values from every
 * given input Observable.
 *
 * <span class="informal">Flattens multiple Observables together by blending
 * their values into one Observable.</span>
 *
 * <img src="./img/merge.png" width="100%">
 *
 * `merge` subscribes to each given input Observable (either the source or an
 * Observable given as argument), and simply forwards (without doing any
 * transformation) all the values from all the input Observables to the output
 * Observable. The output Observable only completes once all input Observables
 * have completed. Any error delivered by an input Observable will be immediately
 * emitted on the output Observable.
 *
 * @example <caption>Merge together two Observables: 1s interval and clicks</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var timer = Rx.Observable.interval(1000);
 * var clicksOrTimer = clicks.merge(timer);
 * clicksOrTimer.subscribe(x => console.log(x));
 *
 * @example <caption>Merge together 3 Observables, but only 2 run concurrently</caption>
 * var timer1 = Rx.Observable.interval(1000).take(10);
 * var timer2 = Rx.Observable.interval(2000).take(6);
 * var timer3 = Rx.Observable.interval(500).take(10);
 * var concurrent = 2; // the argument
 * var merged = timer1.merge(timer2, timer3, concurrent);
 * merged.subscribe(x => console.log(x));
 *
 * @see {@link mergeAll}
 * @see {@link mergeMap}
 * @see {@link mergeMapTo}
 * @see {@link mergeScan}
 *
 * @param {Observable} other An input Observable to merge with the source
 * Observable. More than one input Observables may be given as argument.
 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of input
 * Observables being subscribed to concurrently.
 * @param {Scheduler} [scheduler=null] The Scheduler to use for managing
 * concurrency of input Observables.
 * @return {Observable} an Observable that emits items that are the result of
 * every input Observable.
 * @method merge
 * @owner Observable
 */
function merge$1() {
    var observables = [], len = arguments.length;
    while ( len-- ) observables[ len ] = arguments[ len ];

    observables.unshift(this);
    return mergeStatic.apply(this, observables);
}
/* tslint:enable:max-line-length */
/**
 * Creates an output Observable which concurrently emits all values from every
 * given input Observable.
 *
 * <span class="informal">Flattens multiple Observables together by blending
 * their values into one Observable.</span>
 *
 * <img src="./img/merge.png" width="100%">
 *
 * `merge` subscribes to each given input Observable (as arguments), and simply
 * forwards (without doing any transformation) all the values from all the input
 * Observables to the output Observable. The output Observable only completes
 * once all input Observables have completed. Any error delivered by an input
 * Observable will be immediately emitted on the output Observable.
 *
 * @example <caption>Merge together two Observables: 1s interval and clicks</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var timer = Rx.Observable.interval(1000);
 * var clicksOrTimer = Rx.Observable.merge(clicks, timer);
 * clicksOrTimer.subscribe(x => console.log(x));
 *
 * @example <caption>Merge together 3 Observables, but only 2 run concurrently</caption>
 * var timer1 = Rx.Observable.interval(1000).take(10);
 * var timer2 = Rx.Observable.interval(2000).take(6);
 * var timer3 = Rx.Observable.interval(500).take(10);
 * var concurrent = 2; // the argument
 * var merged = Rx.Observable.merge(timer1, timer2, timer3, concurrent);
 * merged.subscribe(x => console.log(x));
 *
 * @see {@link mergeAll}
 * @see {@link mergeMap}
 * @see {@link mergeMapTo}
 * @see {@link mergeScan}
 *
 * @param {Observable} input1 An input Observable to merge with others.
 * @param {Observable} input2 An input Observable to merge with others.
 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of input
 * Observables being subscribed to concurrently.
 * @param {Scheduler} [scheduler=null] The Scheduler to use for managing
 * concurrency of input Observables.
 * @return {Observable} an Observable that emits items that are the result of
 * every input Observable.
 * @static true
 * @name merge
 * @owner Observable
 */
function mergeStatic() {
    var observables = [], len = arguments.length;
    while ( len-- ) observables[ len ] = arguments[ len ];

    var concurrent = Number.POSITIVE_INFINITY;
    var scheduler = null;
    var last = observables[observables.length - 1];
    if (isScheduler(last)) {
        scheduler = observables.pop();
        if (observables.length > 1 && typeof observables[observables.length - 1] === 'number') {
            concurrent = observables.pop();
        }
    }
    else if (typeof last === 'number') {
        concurrent = observables.pop();
    }
    if (observables.length === 1) {
        return observables[0];
    }
    return new ArrayObservable(observables, scheduler).lift(new MergeAllOperator(concurrent));
}

var merge$$1 = mergeStatic;

Observable.merge = merge$$1;

/**
 * Returns an Observable that mirrors the first source Observable to emit an item
 * from the combination of this Observable and supplied Observables
 * @param {...Observables} ...observables sources used to race for which Observable emits first.
 * @return {Observable} an Observable that mirrors the output of the first Observable to emit an item.
 * @method race
 * @owner Observable
 */
function race() {
    var observables = [], len = arguments.length;
    while ( len-- ) observables[ len ] = arguments[ len ];

    // if the only argument is an array, it was most likely called with
    // `pair([obs1, obs2, ...])`
    if (observables.length === 1 && isArray(observables[0])) {
        observables = observables[0];
    }
    observables.unshift(this);
    return raceStatic.apply(this, observables);
}
function raceStatic() {
    var observables = [], len = arguments.length;
    while ( len-- ) observables[ len ] = arguments[ len ];

    // if the only argument is an array, it was most likely called with
    // `pair([obs1, obs2, ...])`
    if (observables.length === 1) {
        if (isArray(observables[0])) {
            observables = observables[0];
        }
        else {
            return observables[0];
        }
    }
    return new ArrayObservable(observables).lift(new RaceOperator());
}
var RaceOperator = function RaceOperator () {};

RaceOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new RaceSubscriber(subscriber));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var RaceSubscriber = (function (OuterSubscriber$$1) {
    function RaceSubscriber(destination) {
        OuterSubscriber$$1.call(this, destination);
        this.hasFirst = false;
        this.observables = [];
        this.subscriptions = [];
    }

    if ( OuterSubscriber$$1 ) RaceSubscriber.__proto__ = OuterSubscriber$$1;
    RaceSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    RaceSubscriber.prototype.constructor = RaceSubscriber;
    RaceSubscriber.prototype._next = function _next (observable) {
        this.observables.push(observable);
    };
    RaceSubscriber.prototype._complete = function _complete () {
        var this$1 = this;

        var observables = this.observables;
        var len = observables.length;
        if (len === 0) {
            this.destination.complete();
        }
        else {
            for (var i = 0; i < len; i++) {
                var observable = observables[i];
                var subscription = subscribeToResult(this$1, observable, observable, i);
                if (this$1.subscriptions) {
                    this$1.subscriptions.push(subscription);
                    this$1.add(subscription);
                }
            }
            this.observables = null;
        }
    };
    RaceSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        var this$1 = this;

        if (!this.hasFirst) {
            this.hasFirst = true;
            for (var i = 0; i < this.subscriptions.length; i++) {
                if (i !== outerIndex) {
                    var subscription = this$1.subscriptions[i];
                    subscription.unsubscribe();
                    this$1.remove(subscription);
                }
            }
            this.subscriptions = null;
        }
        this.destination.next(innerValue);
    };

    return RaceSubscriber;
}(OuterSubscriber));

Observable.race = raceStatic;

/* tslint:disable:no-empty */
function noop() { }

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var NeverObservable = (function (Observable$$1) {
    function NeverObservable() {
        Observable$$1.call(this);
    }

    if ( Observable$$1 ) NeverObservable.__proto__ = Observable$$1;
    NeverObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    NeverObservable.prototype.constructor = NeverObservable;
    /**
     * Creates an Observable that emits no items to the Observer.
     *
     * <span class="informal">An Observable that never emits anything.</span>
     *
     * <img src="./img/never.png" width="100%">
     *
     * This static operator is useful for creating a simple Observable that emits
     * neither values nor errors nor the completion notification. It can be used
     * for testing purposes or for composing with other Observables. Please not
     * that by never emitting a complete notification, this Observable keeps the
     * subscription from being disposed automatically. Subscriptions need to be
     * manually disposed.
     *
     * @example <caption>Emit the number 7, then never emit anything else (not even complete).</caption>
     * function info() {
     *   console.log('Will not be called');
     * }
     * var result = Rx.Observable.never().startWith(7);
     * result.subscribe(x => console.log(x), info, info);
     *
     * @see {@link create}
     * @see {@link empty}
     * @see {@link of}
     * @see {@link throw}
     *
     * @return {Observable} A "never" Observable: never emits anything.
     * @static true
     * @name never
     * @owner Observable
     */
    NeverObservable.create = function create () {
        return new NeverObservable();
    };
    NeverObservable.prototype._subscribe = function _subscribe (subscriber) {
        noop();
    };

    return NeverObservable;
}(Observable));

var never = NeverObservable.create;

Observable.never = never;

var of$1 = ArrayObservable.of;

Observable.of = of$1;

function onErrorResumeNext() {
    var nextSources = [], len = arguments.length;
    while ( len-- ) nextSources[ len ] = arguments[ len ];

    if (nextSources.length === 1 && isArray(nextSources[0])) {
        nextSources = nextSources[0];
    }
    return this.lift(new OnErrorResumeNextOperator(nextSources));
}
/* tslint:enable:max-line-length */
function onErrorResumeNextStatic() {
    var nextSources = [], len = arguments.length;
    while ( len-- ) nextSources[ len ] = arguments[ len ];

    var source = null;
    if (nextSources.length === 1 && isArray(nextSources[0])) {
        nextSources = nextSources[0];
    }
    source = nextSources.shift();
    return new FromObservable(source, null).lift(new OnErrorResumeNextOperator(nextSources));
}
var OnErrorResumeNextOperator = function OnErrorResumeNextOperator(nextSources) {
    this.nextSources = nextSources;
};
OnErrorResumeNextOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new OnErrorResumeNextSubscriber(subscriber, this.nextSources));
};
var OnErrorResumeNextSubscriber = (function (OuterSubscriber$$1) {
    function OnErrorResumeNextSubscriber(destination, nextSources) {
        OuterSubscriber$$1.call(this, destination);
        this.destination = destination;
        this.nextSources = nextSources;
    }

    if ( OuterSubscriber$$1 ) OnErrorResumeNextSubscriber.__proto__ = OuterSubscriber$$1;
    OnErrorResumeNextSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    OnErrorResumeNextSubscriber.prototype.constructor = OnErrorResumeNextSubscriber;
    OnErrorResumeNextSubscriber.prototype.notifyError = function notifyError (error, innerSub) {
        this.subscribeToNextSource();
    };
    OnErrorResumeNextSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        this.subscribeToNextSource();
    };
    OnErrorResumeNextSubscriber.prototype._error = function _error (err) {
        this.subscribeToNextSource();
    };
    OnErrorResumeNextSubscriber.prototype._complete = function _complete () {
        this.subscribeToNextSource();
    };
    OnErrorResumeNextSubscriber.prototype.subscribeToNextSource = function subscribeToNextSource () {
        var next = this.nextSources.shift();
        if (next) {
            this.add(subscribeToResult(this, next));
        }
        else {
            this.destination.complete();
        }
    };

    return OnErrorResumeNextSubscriber;
}(OuterSubscriber));

Observable.onErrorResumeNext = onErrorResumeNextStatic;

function dispatch$2(state) {
    var obj = state.obj;
    var keys = state.keys;
    var length = state.length;
    var index = state.index;
    var subscriber = state.subscriber;
    if (index === length) {
        subscriber.complete();
        return;
    }
    var key = keys[index];
    subscriber.next([key, obj[key]]);
    state.index = index + 1;
    this.schedule(state);
}
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var PairsObservable = (function (Observable$$1) {
    function PairsObservable(obj, scheduler) {
        Observable$$1.call(this);
        this.obj = obj;
        this.scheduler = scheduler;
        this.keys = Object.keys(obj);
    }

    if ( Observable$$1 ) PairsObservable.__proto__ = Observable$$1;
    PairsObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    PairsObservable.prototype.constructor = PairsObservable;
    /**
     * Convert an object into an observable sequence of [key, value] pairs
     * using an optional Scheduler to enumerate the object.
     *
     * @example <caption>Converts a javascript object to an Observable</caption>
     * var obj = {
     *   foo: 42,
     *   bar: 56,
     *   baz: 78
     * };
     *
     * var source = Rx.Observable.pairs(obj);
     *
     * var subscription = source.subscribe(
     *   function (x) {
     *     console.log('Next: %s', x);
     *   },
     *   function (err) {
     *     console.log('Error: %s', err);
     *   },
     *   function () {
     *     console.log('Completed');
     *   });
     *
     * @param {Object} obj The object to inspect and turn into an
     * Observable sequence.
     * @param {Scheduler} [scheduler] An optional Scheduler to run the
     * enumeration of the input sequence on.
     * @returns {(Observable<Array<string | T>>)} An observable sequence of
     * [key, value] pairs from the object.
     */
    PairsObservable.create = function create (obj, scheduler) {
        return new PairsObservable(obj, scheduler);
    };
    PairsObservable.prototype._subscribe = function _subscribe (subscriber) {
        var this$1 = this;

        var ref = this;
        var keys = ref.keys;
        var scheduler = ref.scheduler;
        var length = keys.length;
        if (scheduler) {
            return scheduler.schedule(dispatch$2, 0, {
                obj: this.obj, keys: keys, length: length, index: 0, subscriber: subscriber
            });
        }
        else {
            for (var idx = 0; idx < length; idx++) {
                var key = keys[idx];
                subscriber.next([key, this$1.obj[key]]);
            }
            subscriber.complete();
        }
    };

    return PairsObservable;
}(Observable));

var pairs = PairsObservable.create;

Observable.pairs = pairs;

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var RangeObservable = (function (Observable$$1) {
    function RangeObservable(start, count, scheduler) {
        Observable$$1.call(this);
        this.start = start;
        this._count = count;
        this.scheduler = scheduler;
    }

    if ( Observable$$1 ) RangeObservable.__proto__ = Observable$$1;
    RangeObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    RangeObservable.prototype.constructor = RangeObservable;
    /**
     * Creates an Observable that emits a sequence of numbers within a specified
     * range.
     *
     * <span class="informal">Emits a sequence of numbers in a range.</span>
     *
     * <img src="./img/range.png" width="100%">
     *
     * `range` operator emits a range of sequential integers, in order, where you
     * select the `start` of the range and its `length`. By default, uses no
     * Scheduler and just delivers the notifications synchronously, but may use
     * an optional Scheduler to regulate those deliveries.
     *
     * @example <caption>Emits the numbers 1 to 10</caption>
     * var numbers = Rx.Observable.range(1, 10);
     * numbers.subscribe(x => console.log(x));
     *
     * @see {@link timer}
     * @see {@link interval}
     *
     * @param {number} [start=0] The value of the first integer in the sequence.
     * @param {number} [count=0] The number of sequential integers to generate.
     * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
     * the emissions of the notifications.
     * @return {Observable} An Observable of numbers that emits a finite range of
     * sequential integers.
     * @static true
     * @name range
     * @owner Observable
     */
    RangeObservable.create = function create (start, count, scheduler) {
        if ( start === void 0 ) start = 0;
        if ( count === void 0 ) count = 0;

        return new RangeObservable(start, count, scheduler);
    };
    RangeObservable.dispatch = function dispatch (state) {
        var start = state.start;
        var index = state.index;
        var count = state.count;
        var subscriber = state.subscriber;
        if (index >= count) {
            subscriber.complete();
            return;
        }
        subscriber.next(start);
        if (subscriber.closed) {
            return;
        }
        state.index = index + 1;
        state.start = start + 1;
        this.schedule(state);
    };
    RangeObservable.prototype._subscribe = function _subscribe (subscriber) {
        var index = 0;
        var start = this.start;
        var count = this._count;
        var scheduler = this.scheduler;
        if (scheduler) {
            return scheduler.schedule(RangeObservable.dispatch, 0, {
                index: index, count: count, start: start, subscriber: subscriber
            });
        }
        else {
            do {
                if (index++ >= count) {
                    subscriber.complete();
                    break;
                }
                subscriber.next(start++);
                if (subscriber.closed) {
                    break;
                }
            } while (true);
        }
    };

    return RangeObservable;
}(Observable));

var range = RangeObservable.create;

Observable.range = range;

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var UsingObservable = (function (Observable$$1) {
    function UsingObservable(resourceFactory, observableFactory) {
        Observable$$1.call(this);
        this.resourceFactory = resourceFactory;
        this.observableFactory = observableFactory;
    }

    if ( Observable$$1 ) UsingObservable.__proto__ = Observable$$1;
    UsingObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    UsingObservable.prototype.constructor = UsingObservable;
    UsingObservable.create = function create (resourceFactory, observableFactory) {
        return new UsingObservable(resourceFactory, observableFactory);
    };
    UsingObservable.prototype._subscribe = function _subscribe (subscriber) {
        var ref = this;
        var resourceFactory = ref.resourceFactory;
        var observableFactory = ref.observableFactory;
        var resource;
        try {
            resource = resourceFactory();
            return new UsingSubscriber(subscriber, resource, observableFactory);
        }
        catch (err) {
            subscriber.error(err);
        }
    };

    return UsingObservable;
}(Observable));
var UsingSubscriber = (function (OuterSubscriber$$1) {
    function UsingSubscriber(destination, resource, observableFactory) {
        OuterSubscriber$$1.call(this, destination);
        this.resource = resource;
        this.observableFactory = observableFactory;
        destination.add(resource);
        this.tryUse();
    }

    if ( OuterSubscriber$$1 ) UsingSubscriber.__proto__ = OuterSubscriber$$1;
    UsingSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    UsingSubscriber.prototype.constructor = UsingSubscriber;
    UsingSubscriber.prototype.tryUse = function tryUse () {
        try {
            var source = this.observableFactory.call(this, this.resource);
            if (source) {
                this.add(subscribeToResult(this, source));
            }
        }
        catch (err) {
            this._error(err);
        }
    };

    return UsingSubscriber;
}(OuterSubscriber));

var using = UsingObservable.create;

Observable.using = using;

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var ErrorObservable = (function (Observable$$1) {
    function ErrorObservable(error, scheduler) {
        Observable$$1.call(this);
        this.error = error;
        this.scheduler = scheduler;
    }

    if ( Observable$$1 ) ErrorObservable.__proto__ = Observable$$1;
    ErrorObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    ErrorObservable.prototype.constructor = ErrorObservable;
    /**
     * Creates an Observable that emits no items to the Observer and immediately
     * emits an error notification.
     *
     * <span class="informal">Just emits 'error', and nothing else.
     * </span>
     *
     * <img src="./img/throw.png" width="100%">
     *
     * This static operator is useful for creating a simple Observable that only
     * emits the error notification. It can be used for composing with other
     * Observables, such as in a {@link mergeMap}.
     *
     * @example <caption>Emit the number 7, then emit an error.</caption>
     * var result = Rx.Observable.throw(new Error('oops!')).startWith(7);
     * result.subscribe(x => console.log(x), e => console.error(e));
     *
     * @example <caption>Map and flattens numbers to the sequence 'a', 'b', 'c', but throw an error for 13</caption>
     * var interval = Rx.Observable.interval(1000);
     * var result = interval.mergeMap(x =>
     *   x === 13 ?
     *     Rx.Observable.throw('Thirteens are bad') :
     *     Rx.Observable.of('a', 'b', 'c')
     * );
     * result.subscribe(x => console.log(x), e => console.error(e));
     *
     * @see {@link create}
     * @see {@link empty}
     * @see {@link never}
     * @see {@link of}
     *
     * @param {any} error The particular Error to pass to the error notification.
     * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
     * the emission of the error notification.
     * @return {Observable} An error Observable: emits only the error notification
     * using the given error argument.
     * @static true
     * @name throw
     * @owner Observable
     */
    ErrorObservable.create = function create (error, scheduler) {
        return new ErrorObservable(error, scheduler);
    };
    ErrorObservable.dispatch = function dispatch (arg) {
        var error = arg.error;
        var subscriber = arg.subscriber;
        subscriber.error(error);
    };
    ErrorObservable.prototype._subscribe = function _subscribe (subscriber) {
        var error = this.error;
        var scheduler = this.scheduler;
        if (scheduler) {
            return scheduler.schedule(ErrorObservable.dispatch, 0, {
                error: error, subscriber: subscriber
            });
        }
        else {
            subscriber.error(error);
        }
    };

    return ErrorObservable;
}(Observable));

var _throw = ErrorObservable.create;

Observable.throw = _throw;

function isDate(value) {
    return value instanceof Date && !isNaN(+value);
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var TimerObservable = (function (Observable$$1) {
    function TimerObservable(dueTime, period, scheduler) {
        if ( dueTime === void 0 ) dueTime = 0;

        Observable$$1.call(this);
        this.period = -1;
        this.dueTime = 0;
        if (isNumeric(period)) {
            this.period = Number(period) < 1 && 1 || Number(period);
        }
        else if (isScheduler(period)) {
            scheduler = period;
        }
        if (!isScheduler(scheduler)) {
            scheduler = async;
        }
        this.scheduler = scheduler;
        this.dueTime = isDate(dueTime) ?
            (+dueTime - this.scheduler.now()) :
            dueTime;
    }

    if ( Observable$$1 ) TimerObservable.__proto__ = Observable$$1;
    TimerObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    TimerObservable.prototype.constructor = TimerObservable;
    /**
     * Creates an Observable that starts emitting after an `initialDelay` and
     * emits ever increasing numbers after each `period` of time thereafter.
     *
     * <span class="informal">Its like {@link interval}, but you can specify when
     * should the emissions start.</span>
     *
     * <img src="./img/timer.png" width="100%">
     *
     * `timer` returns an Observable that emits an infinite sequence of ascending
     * integers, with a constant interval of time, `period` of your choosing
     * between those emissions. The first emission happens after the specified
     * `initialDelay`. The initial delay may be a {@link Date}. By default, this
     * operator uses the `async` Scheduler to provide a notion of time, but you
     * may pass any Scheduler to it. If `period` is not specified, the output
     * Observable emits only one value, `0`. Otherwise, it emits an infinite
     * sequence.
     *
     * @example <caption>Emits ascending numbers, one every second (1000ms), starting after 3 seconds</caption>
     * var numbers = Rx.Observable.timer(3000, 1000);
     * numbers.subscribe(x => console.log(x));
     *
     * @example <caption>Emits one number after five seconds</caption>
     * var numbers = Rx.Observable.timer(5000);
     * numbers.subscribe(x => console.log(x));
     *
     * @see {@link interval}
     * @see {@link delay}
     *
     * @param {number|Date} initialDelay The initial delay time to wait before
     * emitting the first value of `0`.
     * @param {number} [period] The period of time between emissions of the
     * subsequent numbers.
     * @param {Scheduler} [scheduler=async] The Scheduler to use for scheduling
     * the emission of values, and providing a notion of "time".
     * @return {Observable} An Observable that emits a `0` after the
     * `initialDelay` and ever increasing numbers after each `period` of time
     * thereafter.
     * @static true
     * @name timer
     * @owner Observable
     */
    TimerObservable.create = function create (initialDelay, period, scheduler) {
        if ( initialDelay === void 0 ) initialDelay = 0;

        return new TimerObservable(initialDelay, period, scheduler);
    };
    TimerObservable.dispatch = function dispatch (state) {
        var index = state.index;
        var period = state.period;
        var subscriber = state.subscriber;
        var action = this;
        subscriber.next(index);
        if (subscriber.closed) {
            return;
        }
        else if (period === -1) {
            return subscriber.complete();
        }
        state.index = index + 1;
        action.schedule(state, period);
    };
    TimerObservable.prototype._subscribe = function _subscribe (subscriber) {
        var index = 0;
        var ref = this;
        var period = ref.period;
        var dueTime = ref.dueTime;
        var scheduler = ref.scheduler;
        return scheduler.schedule(TimerObservable.dispatch, dueTime, {
            index: index, period: period, subscriber: subscriber
        });
    };

    return TimerObservable;
}(Observable));

var timer = TimerObservable.create;

Observable.timer = timer;

/**
 * @param observables
 * @return {Observable<R>}
 * @method zip
 * @owner Observable
 */
function zipProto() {
    var observables = [], len = arguments.length;
    while ( len-- ) observables[ len ] = arguments[ len ];

    observables.unshift(this);
    return zipStatic.apply(this, observables);
}
/* tslint:enable:max-line-length */
/**
 * @param observables
 * @return {Observable<R>}
 * @static true
 * @name zip
 * @owner Observable
 */
function zipStatic() {
    var observables = [], len = arguments.length;
    while ( len-- ) observables[ len ] = arguments[ len ];

    var project = observables[observables.length - 1];
    if (typeof project === 'function') {
        observables.pop();
    }
    return new ArrayObservable(observables).lift(new ZipOperator(project));
}
var ZipOperator = function ZipOperator(project) {
    this.project = project;
};
ZipOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new ZipSubscriber(subscriber, this.project));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ZipSubscriber = (function (Subscriber$$1) {
    function ZipSubscriber(destination, project, values) {
        if ( values === void 0 ) values = Object.create(null);

        Subscriber$$1.call(this, destination);
        this.index = 0;
        this.iterators = [];
        this.active = 0;
        this.project = (typeof project === 'function') ? project : null;
        this.values = values;
    }

    if ( Subscriber$$1 ) ZipSubscriber.__proto__ = Subscriber$$1;
    ZipSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    ZipSubscriber.prototype.constructor = ZipSubscriber;
    ZipSubscriber.prototype._next = function _next (value) {
        var iterators = this.iterators;
        var index = this.index++;
        if (isArray(value)) {
            iterators.push(new StaticArrayIterator(value));
        }
        else if (typeof value[$$iterator] === 'function') {
            iterators.push(new StaticIterator(value[$$iterator]()));
        }
        else {
            iterators.push(new ZipBufferIterator(this.destination, this, value, index));
        }
    };
    ZipSubscriber.prototype._complete = function _complete () {
        var this$1 = this;

        var iterators = this.iterators;
        var len = iterators.length;
        this.active = len;
        for (var i = 0; i < len; i++) {
            var iterator = iterators[i];
            if (iterator.stillUnsubscribed) {
                this$1.add(iterator.subscribe(iterator, i));
            }
            else {
                this$1.active--; // not an observable
            }
        }
    };
    ZipSubscriber.prototype.notifyInactive = function notifyInactive () {
        this.active--;
        if (this.active === 0) {
            this.destination.complete();
        }
    };
    ZipSubscriber.prototype.checkIterators = function checkIterators () {
        var iterators = this.iterators;
        var len = iterators.length;
        var destination = this.destination;
        // abort if not all of them have values
        for (var i = 0; i < len; i++) {
            var iterator = iterators[i];
            if (typeof iterator.hasValue === 'function' && !iterator.hasValue()) {
                return;
            }
        }
        var shouldComplete = false;
        var args = [];
        for (var i$1 = 0; i$1 < len; i$1++) {
            var iterator$1 = iterators[i$1];
            var result = iterator$1.next();
            // check to see if it's completed now that you've gotten
            // the next value.
            if (iterator$1.hasCompleted()) {
                shouldComplete = true;
            }
            if (result.done) {
                destination.complete();
                return;
            }
            args.push(result.value);
        }
        if (this.project) {
            this._tryProject(args);
        }
        else {
            destination.next(args);
        }
        if (shouldComplete) {
            destination.complete();
        }
    };
    ZipSubscriber.prototype._tryProject = function _tryProject (args) {
        var result;
        try {
            result = this.project.apply(this, args);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.destination.next(result);
    };

    return ZipSubscriber;
}(Subscriber));
var StaticIterator = function StaticIterator(iterator) {
    this.iterator = iterator;
    this.nextResult = iterator.next();
};
StaticIterator.prototype.hasValue = function hasValue () {
    return true;
};
StaticIterator.prototype.next = function next () {
    var result = this.nextResult;
    this.nextResult = this.iterator.next();
    return result;
};
StaticIterator.prototype.hasCompleted = function hasCompleted () {
    var nextResult = this.nextResult;
    return nextResult && nextResult.done;
};
var StaticArrayIterator = function StaticArrayIterator(array) {
    this.array = array;
    this.index = 0;
    this.length = 0;
    this.length = array.length;
};
StaticArrayIterator.prototype[$$iterator] = function () {
    return this;
};
StaticArrayIterator.prototype.next = function next (value) {
    var i = this.index++;
    var array = this.array;
    return i < this.length ? { value: array[i], done: false } : { value: null, done: true };
};
StaticArrayIterator.prototype.hasValue = function hasValue () {
    return this.array.length > this.index;
};
StaticArrayIterator.prototype.hasCompleted = function hasCompleted () {
    return this.array.length === this.index;
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ZipBufferIterator = (function (OuterSubscriber$$1) {
    function ZipBufferIterator(destination, parent, observable, index) {
        OuterSubscriber$$1.call(this, destination);
        this.parent = parent;
        this.observable = observable;
        this.index = index;
        this.stillUnsubscribed = true;
        this.buffer = [];
        this.isComplete = false;
    }

    if ( OuterSubscriber$$1 ) ZipBufferIterator.__proto__ = OuterSubscriber$$1;
    ZipBufferIterator.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    ZipBufferIterator.prototype.constructor = ZipBufferIterator;
    ZipBufferIterator.prototype[$$iterator] = function () {
        return this;
    };
    // NOTE: there is actually a name collision here with Subscriber.next and Iterator.next
    //    this is legit because `next()` will never be called by a subscription in this case.
    ZipBufferIterator.prototype.next = function next () {
        var buffer = this.buffer;
        if (buffer.length === 0 && this.isComplete) {
            return { value: null, done: true };
        }
        else {
            return { value: buffer.shift(), done: false };
        }
    };
    ZipBufferIterator.prototype.hasValue = function hasValue () {
        return this.buffer.length > 0;
    };
    ZipBufferIterator.prototype.hasCompleted = function hasCompleted () {
        return this.buffer.length === 0 && this.isComplete;
    };
    ZipBufferIterator.prototype.notifyComplete = function notifyComplete () {
        if (this.buffer.length > 0) {
            this.isComplete = true;
            this.parent.notifyInactive();
        }
        else {
            this.destination.complete();
        }
    };
    ZipBufferIterator.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.buffer.push(innerValue);
        this.parent.checkIterators();
    };
    ZipBufferIterator.prototype.subscribe = function subscribe (value, index) {
        return subscribeToResult(this, this.observable, this, index);
    };

    return ZipBufferIterator;
}(OuterSubscriber));

var zip = zipStatic;

Observable.zip = zip;

/**
 * Applies a given `project` function to each value emitted by the source
 * Observable, and emits the resulting values as an Observable.
 *
 * <span class="informal">Like [Array.prototype.map()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map),
 * it passes each source value through a transformation function to get
 * corresponding output values.</span>
 *
 * <img src="./img/map.png" width="100%">
 *
 * Similar to the well known `Array.prototype.map` function, this operator
 * applies a projection to each value and emits that projection in the output
 * Observable.
 *
 * @example <caption>Map every every click to the clientX position of that click</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var positions = clicks.map(ev => ev.clientX);
 * positions.subscribe(x => console.log(x));
 *
 * @see {@link mapTo}
 * @see {@link pluck}
 *
 * @param {function(value: T, index: number): R} project The function to apply
 * to each `value` emitted by the source Observable. The `index` parameter is
 * the number `i` for the i-th emission that has happened since the
 * subscription, starting from the number `0`.
 * @param {any} [thisArg] An optional argument to define what `this` is in the
 * `project` function.
 * @return {Observable<R>} An Observable that emits the values from the source
 * Observable transformed by the given `project` function.
 * @method map
 * @owner Observable
 */
function map(project, thisArg) {
    if (typeof project !== 'function') {
        throw new TypeError('argument is not a function. Are you looking for `mapTo()`?');
    }
    return this.lift(new MapOperator(project, thisArg));
}
var MapOperator = function MapOperator(project, thisArg) {
    this.project = project;
    this.thisArg = thisArg;
};
MapOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new MapSubscriber(subscriber, this.project, this.thisArg));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var MapSubscriber = (function (Subscriber$$1) {
    function MapSubscriber(destination, project, thisArg) {
        Subscriber$$1.call(this, destination);
        this.project = project;
        this.count = 0;
        this.thisArg = thisArg || this;
    }

    if ( Subscriber$$1 ) MapSubscriber.__proto__ = Subscriber$$1;
    MapSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    MapSubscriber.prototype.constructor = MapSubscriber;
    // NOTE: This looks unoptimized, but it's actually purposefully NOT
    // using try/catch optimizations.
    MapSubscriber.prototype._next = function _next (value) {
        var result;
        try {
            result = this.project.call(this.thisArg, value, this.count++);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.destination.next(result);
    };

    return MapSubscriber;
}(Subscriber));

function getCORSRequest() {
    if (root.XMLHttpRequest) {
        var xhr = new root.XMLHttpRequest();
        if ('withCredentials' in xhr) {
            xhr.withCredentials = !!this.withCredentials;
        }
        return xhr;
    }
    else if (!!root.XDomainRequest) {
        return new root.XDomainRequest();
    }
    else {
        throw new Error('CORS is not supported by your browser');
    }
}
function getXMLHttpRequest() {
    if (root.XMLHttpRequest) {
        return new root.XMLHttpRequest();
    }
    else {
        var progId;
        try {
            var progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
            for (var i = 0; i < 3; i++) {
                try {
                    progId = progIds[i];
                    if (new root.ActiveXObject(progId)) {
                        break;
                    }
                }
                catch (e) {
                }
            }
            return new root.ActiveXObject(progId);
        }
        catch (e) {
            throw new Error('XMLHttpRequest is not supported by your browser');
        }
    }
}
function ajaxGet(url, headers) {
    if ( headers === void 0 ) headers = null;

    return new AjaxObservable({ method: 'GET', url: url, headers: headers });
}

function ajaxPost(url, body, headers) {
    return new AjaxObservable({ method: 'POST', url: url, body: body, headers: headers });
}

function ajaxDelete(url, headers) {
    return new AjaxObservable({ method: 'DELETE', url: url, headers: headers });
}

function ajaxPut(url, body, headers) {
    return new AjaxObservable({ method: 'PUT', url: url, body: body, headers: headers });
}

function ajaxGetJSON(url, headers) {
    return new AjaxObservable({ method: 'GET', url: url, responseType: 'json', headers: headers })
        .lift(new MapOperator(function (x, index) { return x.response; }, null));
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var AjaxObservable = (function (Observable$$1) {
    function AjaxObservable(urlOrRequest) {
        Observable$$1.call(this);
        var request = {
            async: true,
            createXHR: function () {
                return this.crossDomain ? getCORSRequest.call(this) : getXMLHttpRequest();
            },
            crossDomain: false,
            withCredentials: false,
            headers: {},
            method: 'GET',
            responseType: 'json',
            timeout: 0
        };
        if (typeof urlOrRequest === 'string') {
            request.url = urlOrRequest;
        }
        else {
            for (var prop in urlOrRequest) {
                if (urlOrRequest.hasOwnProperty(prop)) {
                    request[prop] = urlOrRequest[prop];
                }
            }
        }
        this.request = request;
    }

    if ( Observable$$1 ) AjaxObservable.__proto__ = Observable$$1;
    AjaxObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    AjaxObservable.prototype.constructor = AjaxObservable;
    AjaxObservable.prototype._subscribe = function _subscribe (subscriber) {
        return new AjaxSubscriber(subscriber, this.request);
    };

    return AjaxObservable;
}(Observable));
/**
 * Creates an observable for an Ajax request with either a request object with
 * url, headers, etc or a string for a URL.
 *
 * @example
 * source = Rx.Observable.ajax('/products');
 * source = Rx.Observable.ajax({ url: 'products', method: 'GET' });
 *
 * @param {string|Object} request Can be one of the following:
 *   A string of the URL to make the Ajax call.
 *   An object with the following properties
 *   - url: URL of the request
 *   - body: The body of the request
 *   - method: Method of the request, such as GET, POST, PUT, PATCH, DELETE
 *   - async: Whether the request is async
 *   - headers: Optional headers
 *   - crossDomain: true if a cross domain request, else false
 *   - createXHR: a function to override if you need to use an alternate
 *   XMLHttpRequest implementation.
 *   - resultSelector: a function to use to alter the output value type of
 *   the Observable. Gets {@link AjaxResponse} as an argument.
 * @return {Observable} An observable sequence containing the XMLHttpRequest.
 * @static true
 * @name ajax
 * @owner Observable
*/
AjaxObservable.create = (function () {
    var create = function (urlOrRequest) {
        return new AjaxObservable(urlOrRequest);
    };
    create.get = ajaxGet;
    create.post = ajaxPost;
    create.delete = ajaxDelete;
    create.put = ajaxPut;
    create.getJSON = ajaxGetJSON;
    return create;
})();
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var AjaxSubscriber = (function (Subscriber$$1) {
    function AjaxSubscriber(destination, request) {
        Subscriber$$1.call(this, destination);
        this.request = request;
        this.done = false;
        var headers = request.headers = request.headers || {};
        // force CORS if requested
        if (!request.crossDomain && !headers['X-Requested-With']) {
            headers['X-Requested-With'] = 'XMLHttpRequest';
        }
        // ensure content type is set
        if (!('Content-Type' in headers) && !(root.FormData && request.body instanceof root.FormData) && typeof request.body !== 'undefined') {
            headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        }
        // properly serialize body
        request.body = this.serializeBody(request.body, request.headers['Content-Type']);
        this.send();
    }

    if ( Subscriber$$1 ) AjaxSubscriber.__proto__ = Subscriber$$1;
    AjaxSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    AjaxSubscriber.prototype.constructor = AjaxSubscriber;
    AjaxSubscriber.prototype.next = function next (e) {
        this.done = true;
        var ref = this;
        var xhr = ref.xhr;
        var request = ref.request;
        var destination = ref.destination;
        var response = new AjaxResponse(e, xhr, request);
        destination.next(response);
    };
    AjaxSubscriber.prototype.send = function send () {
        var ref = this;
        var request = ref.request;
        var ref_request = ref.request;
        var user = ref_request.user;
        var method = ref_request.method;
        var url = ref_request.url;
        var async = ref_request.async;
        var password = ref_request.password;
        var headers = ref_request.headers;
        var body = ref_request.body;
        var createXHR = request.createXHR;
        var xhr = tryCatch(createXHR).call(request);
        if (xhr === errorObject) {
            this.error(errorObject.e);
        }
        else {
            this.xhr = xhr;
            // open XHR first
            var result;
            if (user) {
                result = tryCatch(xhr.open).call(xhr, method, url, async, user, password);
            }
            else {
                result = tryCatch(xhr.open).call(xhr, method, url, async);
            }
            if (result === errorObject) {
                this.error(errorObject.e);
                return null;
            }
            // timeout and responseType can be set once the XHR is open
            xhr.timeout = request.timeout;
            xhr.responseType = request.responseType;
            // set headers
            this.setHeaders(xhr, headers);
            // now set up the events
            this.setupEvents(xhr, request);
            // finally send the request
            if (body) {
                xhr.send(body);
            }
            else {
                xhr.send();
            }
        }
        return xhr;
    };
    AjaxSubscriber.prototype.serializeBody = function serializeBody (body, contentType) {
        if (!body || typeof body === 'string') {
            return body;
        }
        else if (root.FormData && body instanceof root.FormData) {
            return body;
        }
        if (contentType) {
            var splitIndex = contentType.indexOf(';');
            if (splitIndex !== -1) {
                contentType = contentType.substring(0, splitIndex);
            }
        }
        switch (contentType) {
            case 'application/x-www-form-urlencoded':
                return Object.keys(body).map(function (key) { return ((encodeURI(key)) + "=" + (encodeURI(body[key]))); }).join('&');
            case 'application/json':
                return JSON.stringify(body);
            default:
                return body;
        }
    };
    AjaxSubscriber.prototype.setHeaders = function setHeaders (xhr, headers) {
        for (var key in headers) {
            if (headers.hasOwnProperty(key)) {
                xhr.setRequestHeader(key, headers[key]);
            }
        }
    };
    AjaxSubscriber.prototype.setupEvents = function setupEvents (xhr, request) {
        var progressSubscriber = request.progressSubscriber;
        xhr.ontimeout = function xhrTimeout(e) {
            var subscriber = xhrTimeout.subscriber;
            var progressSubscriber = xhrTimeout.progressSubscriber;
            var request = xhrTimeout.request;
            if (progressSubscriber) {
                progressSubscriber.error(e);
            }
            subscriber.error(new AjaxTimeoutError(this, request)); //TODO: Make betterer.
        };
        xhr.ontimeout.request = request;
        xhr.ontimeout.subscriber = this;
        xhr.ontimeout.progressSubscriber = progressSubscriber;
        if (xhr.upload && 'withCredentials' in xhr && root.XDomainRequest) {
            if (progressSubscriber) {
                xhr.onprogress = function xhrProgress(e) {
                    var progressSubscriber = xhrProgress.progressSubscriber;
                    progressSubscriber.next(e);
                };
                xhr.onprogress.progressSubscriber = progressSubscriber;
            }
            xhr.onerror = function xhrError(e) {
                var progressSubscriber = xhrError.progressSubscriber;
                var subscriber = xhrError.subscriber;
                var request = xhrError.request;
                if (progressSubscriber) {
                    progressSubscriber.error(e);
                }
                subscriber.error(new AjaxError('ajax error', this, request));
            };
            xhr.onerror.request = request;
            xhr.onerror.subscriber = this;
            xhr.onerror.progressSubscriber = progressSubscriber;
        }
        xhr.onreadystatechange = function xhrReadyStateChange(e) {
            var subscriber = xhrReadyStateChange.subscriber;
            var progressSubscriber = xhrReadyStateChange.progressSubscriber;
            var request = xhrReadyStateChange.request;
            if (this.readyState === 4) {
                // normalize IE9 bug (http://bugs.jquery.com/ticket/1450)
                var status = this.status === 1223 ? 204 : this.status;
                var response = (this.responseType === 'text' ? (this.response || this.responseText) : this.response);
                // fix status code when it is 0 (0 status is undocumented).
                // Occurs when accessing file resources or on Android 4.1 stock browser
                // while retrieving files from application cache.
                if (status === 0) {
                    status = response ? 200 : 0;
                }
                if (200 <= status && status < 300) {
                    if (progressSubscriber) {
                        progressSubscriber.complete();
                    }
                    subscriber.next(e);
                    subscriber.complete();
                }
                else {
                    if (progressSubscriber) {
                        progressSubscriber.error(e);
                    }
                    subscriber.error(new AjaxError('ajax error ' + status, this, request));
                }
            }
        };
        xhr.onreadystatechange.subscriber = this;
        xhr.onreadystatechange.progressSubscriber = progressSubscriber;
        xhr.onreadystatechange.request = request;
    };
    AjaxSubscriber.prototype.unsubscribe = function unsubscribe () {
        var ref = this;
        var done = ref.done;
        var xhr = ref.xhr;
        if (!done && xhr && xhr.readyState !== 4) {
            xhr.abort();
        }
        Subscriber$$1.prototype.unsubscribe.call(this);
    };

    return AjaxSubscriber;
}(Subscriber));
/**
 * A normalized AJAX response.
 *
 * @see {@link ajax}
 *
 * @class AjaxResponse
 */
var AjaxResponse = function AjaxResponse(originalEvent, xhr, request) {
    this.originalEvent = originalEvent;
    this.xhr = xhr;
    this.request = request;
    this.status = xhr.status;
    this.responseType = xhr.responseType || request.responseType;
    switch (this.responseType) {
        case 'json':
            if ('response' in xhr) {
                //IE does not support json as responseType, parse it internally
                this.response = xhr.responseType ? xhr.response : JSON.parse(xhr.response || xhr.responseText || 'null');
            }
            else {
                this.response = JSON.parse(xhr.responseText || 'null');
            }
            break;
        case 'xml':
            this.response = xhr.responseXML;
            break;
        case 'text':
        default:
            this.response = ('response' in xhr) ? xhr.response : xhr.responseText;
            break;
    }
};
/**
 * A normalized AJAX error.
 *
 * @see {@link ajax}
 *
 * @class AjaxError
 */
var AjaxError = (function (Error) {
    function AjaxError(message, xhr, request) {
        Error.call(this, message);
        this.message = message;
        this.xhr = xhr;
        this.request = request;
        this.status = xhr.status;
    }

    if ( Error ) AjaxError.__proto__ = Error;
    AjaxError.prototype = Object.create( Error && Error.prototype );
    AjaxError.prototype.constructor = AjaxError;

    return AjaxError;
}(Error));
/**
 * @see {@link ajax}
 *
 * @class AjaxTimeoutError
 */
var AjaxTimeoutError = (function (AjaxError) {
    function AjaxTimeoutError(xhr, request) {
        AjaxError.call(this, 'ajax timeout', xhr, request);
    }

    if ( AjaxError ) AjaxTimeoutError.__proto__ = AjaxError;
    AjaxTimeoutError.prototype = Object.create( AjaxError && AjaxError.prototype );
    AjaxTimeoutError.prototype.constructor = AjaxTimeoutError;

    return AjaxTimeoutError;
}(AjaxError));

var ajax = AjaxObservable.create;

Observable.ajax = ajax;

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var QueueAction = (function (AsyncAction$$1) {
    function QueueAction(scheduler, work) {
        AsyncAction$$1.call(this, scheduler, work);
        this.scheduler = scheduler;
        this.work = work;
    }

    if ( AsyncAction$$1 ) QueueAction.__proto__ = AsyncAction$$1;
    QueueAction.prototype = Object.create( AsyncAction$$1 && AsyncAction$$1.prototype );
    QueueAction.prototype.constructor = QueueAction;
    QueueAction.prototype.schedule = function schedule (state, delay) {
        if ( delay === void 0 ) delay = 0;

        if (delay > 0) {
            return AsyncAction$$1.prototype.schedule.call(this, state, delay);
        }
        this.delay = delay;
        this.state = state;
        this.scheduler.flush(this);
        return this;
    };
    QueueAction.prototype.execute = function execute (state, delay) {
        return (delay > 0 || this.closed) ?
            AsyncAction$$1.prototype.execute.call(this, state, delay) :
            this._execute(state, delay);
    };
    QueueAction.prototype.requestAsyncId = function requestAsyncId (scheduler, id, delay) {
        if ( delay === void 0 ) delay = 0;

        // If delay is greater than 0, enqueue as an async action.
        if (delay !== null && delay > 0) {
            return AsyncAction$$1.prototype.requestAsyncId.call(this, scheduler, id, delay);
        }
        // Otherwise flush the scheduler starting with this action.
        return scheduler.flush(this);
    };

    return QueueAction;
}(AsyncAction));

var QueueScheduler = (function (AsyncScheduler$$1) {
	function QueueScheduler () {
		AsyncScheduler$$1.apply(this, arguments);
	}if ( AsyncScheduler$$1 ) QueueScheduler.__proto__ = AsyncScheduler$$1;
	QueueScheduler.prototype = Object.create( AsyncScheduler$$1 && AsyncScheduler$$1.prototype );
	QueueScheduler.prototype.constructor = QueueScheduler;

	

	return QueueScheduler;
}(AsyncScheduler));

var queue = new QueueScheduler(QueueAction);

/**
 * @class ReplaySubject<T>
 */
var ReplaySubject = (function (Subject$$1) {
    function ReplaySubject(bufferSize, windowTime, scheduler) {
        if ( bufferSize === void 0 ) bufferSize = Number.POSITIVE_INFINITY;
        if ( windowTime === void 0 ) windowTime = Number.POSITIVE_INFINITY;

        Subject$$1.call(this);
        this.scheduler = scheduler;
        this._events = [];
        this._bufferSize = bufferSize < 1 ? 1 : bufferSize;
        this._windowTime = windowTime < 1 ? 1 : windowTime;
    }

    if ( Subject$$1 ) ReplaySubject.__proto__ = Subject$$1;
    ReplaySubject.prototype = Object.create( Subject$$1 && Subject$$1.prototype );
    ReplaySubject.prototype.constructor = ReplaySubject;
    ReplaySubject.prototype.next = function next (value) {
        var now = this._getNow();
        this._events.push(new ReplayEvent(now, value));
        this._trimBufferThenGetEvents();
        Subject$$1.prototype.next.call(this, value);
    };
    ReplaySubject.prototype._subscribe = function _subscribe (subscriber) {
        var _events = this._trimBufferThenGetEvents();
        var scheduler = this.scheduler;
        if (scheduler) {
            subscriber.add(subscriber = new ObserveOnSubscriber(subscriber, scheduler));
        }
        var len = _events.length;
        for (var i = 0; i < len && !subscriber.closed; i++) {
            subscriber.next(_events[i].value);
        }
        return Subject$$1.prototype._subscribe.call(this, subscriber);
    };
    ReplaySubject.prototype._getNow = function _getNow () {
        return (this.scheduler || queue).now();
    };
    ReplaySubject.prototype._trimBufferThenGetEvents = function _trimBufferThenGetEvents () {
        var now = this._getNow();
        var _bufferSize = this._bufferSize;
        var _windowTime = this._windowTime;
        var _events = this._events;
        var eventsCount = _events.length;
        var spliceCount = 0;
        // Trim events that fall out of the time window.
        // Start at the front of the list. Break early once
        // we encounter an event that falls within the window.
        while (spliceCount < eventsCount) {
            if ((now - _events[spliceCount].time) < _windowTime) {
                break;
            }
            spliceCount++;
        }
        if (eventsCount > _bufferSize) {
            spliceCount = Math.max(spliceCount, eventsCount - _bufferSize);
        }
        if (spliceCount > 0) {
            _events.splice(0, spliceCount);
        }
        return _events;
    };

    return ReplaySubject;
}(Subject));
var ReplayEvent = function ReplayEvent(time, value) {
    this.time = time;
    this.value = value;
};

var Object$1 = root.Object;
if (typeof Object$1.assign != 'function') {
    (function () {
        Object$1.assign = function assignPolyfill(target) {
            var sources = [], len$1 = arguments.length - 1;
            while ( len$1-- > 0 ) sources[ len$1 ] = arguments[ len$1 + 1 ];

            if (target === undefined || target === null) {
                throw new TypeError('cannot convert undefined or null to object');
            }
            var output = Object$1(target);
            var len = sources.length;
            for (var index = 0; index < len; index++) {
                var source = sources[index];
                if (source !== undefined && source !== null) {
                    for (var key in source) {
                        if (source.hasOwnProperty(key)) {
                            output[key] = source[key];
                        }
                    }
                }
            }
            return output;
        };
    })();
}
var assign = Object$1.assign;

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var WebSocketSubject = (function (AnonymousSubject$$1) {
    function WebSocketSubject(urlConfigOrSource, destination) {
        if (urlConfigOrSource instanceof Observable) {
            AnonymousSubject$$1.call(this, destination, urlConfigOrSource);
        }
        else {
            AnonymousSubject$$1.call(this);
            this.WebSocketCtor = root.WebSocket;
            this._output = new Subject();
            if (typeof urlConfigOrSource === 'string') {
                this.url = urlConfigOrSource;
            }
            else {
                // WARNING: config object could override important members here.
                assign(this, urlConfigOrSource);
            }
            if (!this.WebSocketCtor) {
                throw new Error('no WebSocket constructor can be found');
            }
            this.destination = new ReplaySubject();
        }
    }

    if ( AnonymousSubject$$1 ) WebSocketSubject.__proto__ = AnonymousSubject$$1;
    WebSocketSubject.prototype = Object.create( AnonymousSubject$$1 && AnonymousSubject$$1.prototype );
    WebSocketSubject.prototype.constructor = WebSocketSubject;
    WebSocketSubject.prototype.resultSelector = function resultSelector (e) {
        return JSON.parse(e.data);
    };
    /**
     * @param urlConfigOrSource
     * @return {WebSocketSubject}
     * @static true
     * @name webSocket
     * @owner Observable
     */
    WebSocketSubject.create = function create (urlConfigOrSource) {
        return new WebSocketSubject(urlConfigOrSource);
    };
    WebSocketSubject.prototype.lift = function lift (operator) {
        var sock = new WebSocketSubject(this, this.destination);
        sock.operator = operator;
        return sock;
    };
    // TODO: factor this out to be a proper Operator/Subscriber implementation and eliminate closures
    WebSocketSubject.prototype.multiplex = function multiplex (subMsg, unsubMsg, messageFilter) {
        var self = this;
        return new Observable(function (observer) {
            var result = tryCatch(subMsg)();
            if (result === errorObject) {
                observer.error(errorObject.e);
            }
            else {
                self.next(result);
            }
            var subscription = self.subscribe(function (x) {
                var result = tryCatch(messageFilter)(x);
                if (result === errorObject) {
                    observer.error(errorObject.e);
                }
                else if (result) {
                    observer.next(x);
                }
            }, function (err) { return observer.error(err); }, function () { return observer.complete(); });
            return function () {
                var result = tryCatch(unsubMsg)();
                if (result === errorObject) {
                    observer.error(errorObject.e);
                }
                else {
                    self.next(result);
                }
                subscription.unsubscribe();
            };
        });
    };
    WebSocketSubject.prototype._connectSocket = function _connectSocket () {
        var this$1 = this;

        var ref = this;
        var WebSocketCtor = ref.WebSocketCtor;
        var observer = this._output;
        var socket = null;
        try {
            socket = this.protocol ?
                new WebSocketCtor(this.url, this.protocol) :
                new WebSocketCtor(this.url);
            this.socket = socket;
        }
        catch (e) {
            observer.error(e);
            return;
        }
        var subscription = new Subscription(function () {
            this$1.socket = null;
            if (socket && socket.readyState === 1) {
                socket.close();
            }
        });
        socket.onopen = function (e) {
            var openObserver = this$1.openObserver;
            if (openObserver) {
                openObserver.next(e);
            }
            var queue = this$1.destination;
            this$1.destination = Subscriber.create(function (x) { return socket.readyState === 1 && socket.send(x); }, function (e) {
                var closingObserver = this$1.closingObserver;
                if (closingObserver) {
                    closingObserver.next(undefined);
                }
                if (e && e.code) {
                    socket.close(e.code, e.reason);
                }
                else {
                    observer.error(new TypeError('WebSocketSubject.error must be called with an object with an error code, ' +
                        'and an optional reason: { code: number, reason: string }'));
                }
                this$1.destination = new ReplaySubject();
                this$1.socket = null;
            }, function () {
                var closingObserver = this$1.closingObserver;
                if (closingObserver) {
                    closingObserver.next(undefined);
                }
                socket.close();
                this$1.destination = new ReplaySubject();
                this$1.socket = null;
            });
            if (queue && queue instanceof ReplaySubject) {
                subscription.add(queue.subscribe(this$1.destination));
            }
        };
        socket.onerror = function (e) { return observer.error(e); };
        socket.onclose = function (e) {
            var closeObserver = this$1.closeObserver;
            if (closeObserver) {
                closeObserver.next(e);
            }
            if (e.wasClean) {
                observer.complete();
            }
            else {
                observer.error(e);
            }
        };
        socket.onmessage = function (e) {
            var result = tryCatch(this$1.resultSelector)(e);
            if (result === errorObject) {
                observer.error(errorObject.e);
            }
            else {
                observer.next(result);
            }
        };
    };
    WebSocketSubject.prototype._subscribe = function _subscribe (subscriber) {
        var this$1 = this;

        var ref = this;
        var source = ref.source;
        if (source) {
            return source.subscribe(subscriber);
        }
        if (!this.socket) {
            this._connectSocket();
        }
        var subscription = new Subscription();
        subscription.add(this._output.subscribe(subscriber));
        subscription.add(function () {
            var ref = this$1;
            var socket = ref.socket;
            if (this$1._output.observers.length === 0 && socket && socket.readyState === 1) {
                socket.close();
                this$1.socket = null;
            }
        });
        return subscription;
    };
    WebSocketSubject.prototype.unsubscribe = function unsubscribe () {
        var ref = this;
        var source = ref.source;
        var socket = ref.socket;
        if (socket && socket.readyState === 1) {
            socket.close();
            this.socket = null;
        }
        AnonymousSubject$$1.prototype.unsubscribe.call(this);
        if (!source) {
            this.destination = new ReplaySubject();
        }
    };

    return WebSocketSubject;
}(AnonymousSubject));

var webSocket = WebSocketSubject.create;

Observable.webSocket = webSocket;

/**
 * Buffers the source Observable values until `closingNotifier` emits.
 *
 * <span class="informal">Collects values from the past as an array, and emits
 * that array only when another Observable emits.</span>
 *
 * <img src="./img/buffer.png" width="100%">
 *
 * Buffers the incoming Observable values until the given `closingNotifier`
 * Observable emits a value, at which point it emits the buffer on the output
 * Observable and starts a new buffer internally, awaiting the next time
 * `closingNotifier` emits.
 *
 * @example <caption>On every click, emit array of most recent interval events</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var interval = Rx.Observable.interval(1000);
 * var buffered = interval.buffer(clicks);
 * buffered.subscribe(x => console.log(x));
 *
 * @see {@link bufferCount}
 * @see {@link bufferTime}
 * @see {@link bufferToggle}
 * @see {@link bufferWhen}
 * @see {@link window}
 *
 * @param {Observable<any>} closingNotifier An Observable that signals the
 * buffer to be emitted on the output Observable.
 * @return {Observable<T[]>} An Observable of buffers, which are arrays of
 * values.
 * @method buffer
 * @owner Observable
 */
function buffer(closingNotifier) {
    return this.lift(new BufferOperator(closingNotifier));
}
var BufferOperator = function BufferOperator(closingNotifier) {
    this.closingNotifier = closingNotifier;
};
BufferOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new BufferSubscriber(subscriber, this.closingNotifier));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var BufferSubscriber = (function (OuterSubscriber$$1) {
    function BufferSubscriber(destination, closingNotifier) {
        OuterSubscriber$$1.call(this, destination);
        this.buffer = [];
        this.add(subscribeToResult(this, closingNotifier));
    }

    if ( OuterSubscriber$$1 ) BufferSubscriber.__proto__ = OuterSubscriber$$1;
    BufferSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    BufferSubscriber.prototype.constructor = BufferSubscriber;
    BufferSubscriber.prototype._next = function _next (value) {
        this.buffer.push(value);
    };
    BufferSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        var buffer = this.buffer;
        this.buffer = [];
        this.destination.next(buffer);
    };

    return BufferSubscriber;
}(OuterSubscriber));

Observable.prototype.buffer = buffer;

/**
 * Buffers the source Observable values until the size hits the maximum
 * `bufferSize` given.
 *
 * <span class="informal">Collects values from the past as an array, and emits
 * that array only when its size reaches `bufferSize`.</span>
 *
 * <img src="./img/bufferCount.png" width="100%">
 *
 * Buffers a number of values from the source Observable by `bufferSize` then
 * emits the buffer and clears it, and starts a new buffer each
 * `startBufferEvery` values. If `startBufferEvery` is not provided or is
 * `null`, then new buffers are started immediately at the start of the source
 * and when each buffer closes and is emitted.
 *
 * @example <caption>Emit the last two click events as an array</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var buffered = clicks.bufferCount(2);
 * buffered.subscribe(x => console.log(x));
 *
 * @example <caption>On every click, emit the last two click events as an array</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var buffered = clicks.bufferCount(2, 1);
 * buffered.subscribe(x => console.log(x));
 *
 * @see {@link buffer}
 * @see {@link bufferTime}
 * @see {@link bufferToggle}
 * @see {@link bufferWhen}
 * @see {@link pairwise}
 * @see {@link windowCount}
 *
 * @param {number} bufferSize The maximum size of the buffer emitted.
 * @param {number} [startBufferEvery] Interval at which to start a new buffer.
 * For example if `startBufferEvery` is `2`, then a new buffer will be started
 * on every other value from the source. A new buffer is started at the
 * beginning of the source by default.
 * @return {Observable<T[]>} An Observable of arrays of buffered values.
 * @method bufferCount
 * @owner Observable
 */
function bufferCount(bufferSize, startBufferEvery) {
    if ( startBufferEvery === void 0 ) startBufferEvery = null;

    return this.lift(new BufferCountOperator(bufferSize, startBufferEvery));
}
var BufferCountOperator = function BufferCountOperator(bufferSize, startBufferEvery) {
    this.bufferSize = bufferSize;
    this.startBufferEvery = startBufferEvery;
};
BufferCountOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new BufferCountSubscriber(subscriber, this.bufferSize, this.startBufferEvery));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var BufferCountSubscriber = (function (Subscriber$$1) {
    function BufferCountSubscriber(destination, bufferSize, startBufferEvery) {
        Subscriber$$1.call(this, destination);
        this.bufferSize = bufferSize;
        this.startBufferEvery = startBufferEvery;
        this.buffers = [[]];
        this.count = 0;
    }

    if ( Subscriber$$1 ) BufferCountSubscriber.__proto__ = Subscriber$$1;
    BufferCountSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    BufferCountSubscriber.prototype.constructor = BufferCountSubscriber;
    BufferCountSubscriber.prototype._next = function _next (value) {
        var count = (this.count += 1);
        var destination = this.destination;
        var bufferSize = this.bufferSize;
        var startBufferEvery = (this.startBufferEvery == null) ? bufferSize : this.startBufferEvery;
        var buffers = this.buffers;
        var len = buffers.length;
        var remove = -1;
        if (count % startBufferEvery === 0) {
            buffers.push([]);
        }
        for (var i = 0; i < len; i++) {
            var buffer = buffers[i];
            buffer.push(value);
            if (buffer.length === bufferSize) {
                remove = i;
                destination.next(buffer);
            }
        }
        if (remove !== -1) {
            buffers.splice(remove, 1);
        }
    };
    BufferCountSubscriber.prototype._complete = function _complete () {
        var destination = this.destination;
        var buffers = this.buffers;
        while (buffers.length > 0) {
            var buffer = buffers.shift();
            if (buffer.length > 0) {
                destination.next(buffer);
            }
        }
        Subscriber$$1.prototype._complete.call(this);
    };

    return BufferCountSubscriber;
}(Subscriber));

Observable.prototype.bufferCount = bufferCount;

/**
 * Buffers the source Observable values for a specific time period.
 *
 * <span class="informal">Collects values from the past as an array, and emits
 * those arrays periodically in time.</span>
 *
 * <img src="./img/bufferTime.png" width="100%">
 *
 * Buffers values from the source for a specific time duration `bufferTimeSpan`.
 * Unless the optional argument `bufferCreationInterval` is given, it emits and
 * resets the buffer every `bufferTimeSpan` milliseconds. If
 * `bufferCreationInterval` is given, this operator opens the buffer every
 * `bufferCreationInterval` milliseconds and closes (emits and resets) the
 * buffer every `bufferTimeSpan` milliseconds. When the optional argument
 * `maxBufferSize` is specified, the buffer will be closed either after
 * `bufferTimeSpan` milliseconds or when it contains `maxBufferSize` elements.
 *
 * @example <caption>Every second, emit an array of the recent click events</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var buffered = clicks.bufferTime(1000);
 * buffered.subscribe(x => console.log(x));
 *
 * @example <caption>Every 5 seconds, emit the click events from the next 2 seconds</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var buffered = clicks.bufferTime(2000, 5000);
 * buffered.subscribe(x => console.log(x));
 *
 * @see {@link buffer}
 * @see {@link bufferCount}
 * @see {@link bufferToggle}
 * @see {@link bufferWhen}
 * @see {@link windowTime}
 *
 * @param {number} bufferTimeSpan The amount of time to fill each buffer array.
 * @param {number} [bufferCreationInterval] The interval at which to start new
 * buffers.
 * @param {number} [maxBufferSize] The maximum buffer size.
 * @param {Scheduler} [scheduler=async] The scheduler on which to schedule the
 * intervals that determine buffer boundaries.
 * @return {Observable<T[]>} An observable of arrays of buffered values.
 * @method bufferTime
 * @owner Observable
 */
function bufferTime(bufferTimeSpan) {
    var length = arguments.length;
    var scheduler = async;
    if (isScheduler(arguments[arguments.length - 1])) {
        scheduler = arguments[arguments.length - 1];
        length--;
    }
    var bufferCreationInterval = null;
    if (length >= 2) {
        bufferCreationInterval = arguments[1];
    }
    var maxBufferSize = Number.POSITIVE_INFINITY;
    if (length >= 3) {
        maxBufferSize = arguments[2];
    }
    return this.lift(new BufferTimeOperator(bufferTimeSpan, bufferCreationInterval, maxBufferSize, scheduler));
}
var BufferTimeOperator = function BufferTimeOperator(bufferTimeSpan, bufferCreationInterval, maxBufferSize, scheduler) {
    this.bufferTimeSpan = bufferTimeSpan;
    this.bufferCreationInterval = bufferCreationInterval;
    this.maxBufferSize = maxBufferSize;
    this.scheduler = scheduler;
};
BufferTimeOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new BufferTimeSubscriber(subscriber, this.bufferTimeSpan, this.bufferCreationInterval, this.maxBufferSize, this.scheduler));
};
var Context = function Context() {
    this.buffer = [];
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var BufferTimeSubscriber = (function (Subscriber$$1) {
    function BufferTimeSubscriber(destination, bufferTimeSpan, bufferCreationInterval, maxBufferSize, scheduler) {
        Subscriber$$1.call(this, destination);
        this.bufferTimeSpan = bufferTimeSpan;
        this.bufferCreationInterval = bufferCreationInterval;
        this.maxBufferSize = maxBufferSize;
        this.scheduler = scheduler;
        this.contexts = [];
        var context = this.openContext();
        this.timespanOnly = bufferCreationInterval == null || bufferCreationInterval < 0;
        if (this.timespanOnly) {
            var timeSpanOnlyState = { subscriber: this, context: context, bufferTimeSpan: bufferTimeSpan };
            this.add(context.closeAction = scheduler.schedule(dispatchBufferTimeSpanOnly, bufferTimeSpan, timeSpanOnlyState));
        }
        else {
            var closeState = { subscriber: this, context: context };
            var creationState = { bufferTimeSpan: bufferTimeSpan, bufferCreationInterval: bufferCreationInterval, subscriber: this, scheduler: scheduler };
            this.add(context.closeAction = scheduler.schedule(dispatchBufferClose, bufferTimeSpan, closeState));
            this.add(scheduler.schedule(dispatchBufferCreation, bufferCreationInterval, creationState));
        }
    }

    if ( Subscriber$$1 ) BufferTimeSubscriber.__proto__ = Subscriber$$1;
    BufferTimeSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    BufferTimeSubscriber.prototype.constructor = BufferTimeSubscriber;
    BufferTimeSubscriber.prototype._next = function _next (value) {
        var this$1 = this;

        var contexts = this.contexts;
        var len = contexts.length;
        var filledBufferContext;
        for (var i = 0; i < len; i++) {
            var context = contexts[i];
            var buffer = context.buffer;
            buffer.push(value);
            if (buffer.length == this$1.maxBufferSize) {
                filledBufferContext = context;
            }
        }
        if (filledBufferContext) {
            this.onBufferFull(filledBufferContext);
        }
    };
    BufferTimeSubscriber.prototype._error = function _error (err) {
        this.contexts.length = 0;
        Subscriber$$1.prototype._error.call(this, err);
    };
    BufferTimeSubscriber.prototype._complete = function _complete () {
        var ref = this;
        var contexts = ref.contexts;
        var destination = ref.destination;
        while (contexts.length > 0) {
            var context = contexts.shift();
            destination.next(context.buffer);
        }
        Subscriber$$1.prototype._complete.call(this);
    };
    BufferTimeSubscriber.prototype._unsubscribe = function _unsubscribe () {
        this.contexts = null;
    };
    BufferTimeSubscriber.prototype.onBufferFull = function onBufferFull (context) {
        this.closeContext(context);
        var closeAction = context.closeAction;
        closeAction.unsubscribe();
        this.remove(closeAction);
        if (this.timespanOnly) {
            context = this.openContext();
            var bufferTimeSpan = this.bufferTimeSpan;
            var timeSpanOnlyState = { subscriber: this, context: context, bufferTimeSpan: bufferTimeSpan };
            this.add(context.closeAction = this.scheduler.schedule(dispatchBufferTimeSpanOnly, bufferTimeSpan, timeSpanOnlyState));
        }
    };
    BufferTimeSubscriber.prototype.openContext = function openContext () {
        var context = new Context();
        this.contexts.push(context);
        return context;
    };
    BufferTimeSubscriber.prototype.closeContext = function closeContext (context) {
        this.destination.next(context.buffer);
        var contexts = this.contexts;
        var spliceIndex = contexts ? contexts.indexOf(context) : -1;
        if (spliceIndex >= 0) {
            contexts.splice(contexts.indexOf(context), 1);
        }
    };

    return BufferTimeSubscriber;
}(Subscriber));
function dispatchBufferTimeSpanOnly(state) {
    var subscriber = state.subscriber;
    var prevContext = state.context;
    if (prevContext) {
        subscriber.closeContext(prevContext);
    }
    if (!subscriber.closed) {
        state.context = subscriber.openContext();
        state.context.closeAction = this.schedule(state, state.bufferTimeSpan);
    }
}
function dispatchBufferCreation(state) {
    var bufferCreationInterval = state.bufferCreationInterval;
    var bufferTimeSpan = state.bufferTimeSpan;
    var subscriber = state.subscriber;
    var scheduler = state.scheduler;
    var context = subscriber.openContext();
    var action = this;
    if (!subscriber.closed) {
        subscriber.add(context.closeAction = scheduler.schedule(dispatchBufferClose, bufferTimeSpan, { subscriber: subscriber, context: context }));
        action.schedule(state, bufferCreationInterval);
    }
}
function dispatchBufferClose(arg) {
    var subscriber = arg.subscriber;
    var context = arg.context;
    subscriber.closeContext(context);
}

Observable.prototype.bufferTime = bufferTime;

/**
 * Buffers the source Observable values starting from an emission from
 * `openings` and ending when the output of `closingSelector` emits.
 *
 * <span class="informal">Collects values from the past as an array. Starts
 * collecting only when `opening` emits, and calls the `closingSelector`
 * function to get an Observable that tells when to close the buffer.</span>
 *
 * <img src="./img/bufferToggle.png" width="100%">
 *
 * Buffers values from the source by opening the buffer via signals from an
 * Observable provided to `openings`, and closing and sending the buffers when
 * a Subscribable or Promise returned by the `closingSelector` function emits.
 *
 * @example <caption>Every other second, emit the click events from the next 500ms</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var openings = Rx.Observable.interval(1000);
 * var buffered = clicks.bufferToggle(openings, i =>
 *   i % 2 ? Rx.Observable.interval(500) : Rx.Observable.empty()
 * );
 * buffered.subscribe(x => console.log(x));
 *
 * @see {@link buffer}
 * @see {@link bufferCount}
 * @see {@link bufferTime}
 * @see {@link bufferWhen}
 * @see {@link windowToggle}
 *
 * @param {SubscribableOrPromise<O>} openings A Subscribable or Promise of notifications to start new
 * buffers.
 * @param {function(value: O): SubscribableOrPromise} closingSelector A function that takes
 * the value emitted by the `openings` observable and returns a Subscribable or Promise,
 * which, when it emits, signals that the associated buffer should be emitted
 * and cleared.
 * @return {Observable<T[]>} An observable of arrays of buffered values.
 * @method bufferToggle
 * @owner Observable
 */
function bufferToggle(openings, closingSelector) {
    return this.lift(new BufferToggleOperator(openings, closingSelector));
}
var BufferToggleOperator = function BufferToggleOperator(openings, closingSelector) {
    this.openings = openings;
    this.closingSelector = closingSelector;
};
BufferToggleOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new BufferToggleSubscriber(subscriber, this.openings, this.closingSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var BufferToggleSubscriber = (function (OuterSubscriber$$1) {
    function BufferToggleSubscriber(destination, openings, closingSelector) {
        OuterSubscriber$$1.call(this, destination);
        this.openings = openings;
        this.closingSelector = closingSelector;
        this.contexts = [];
        this.add(subscribeToResult(this, openings));
    }

    if ( OuterSubscriber$$1 ) BufferToggleSubscriber.__proto__ = OuterSubscriber$$1;
    BufferToggleSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    BufferToggleSubscriber.prototype.constructor = BufferToggleSubscriber;
    BufferToggleSubscriber.prototype._next = function _next (value) {
        var contexts = this.contexts;
        var len = contexts.length;
        for (var i = 0; i < len; i++) {
            contexts[i].buffer.push(value);
        }
    };
    BufferToggleSubscriber.prototype._error = function _error (err) {
        var contexts = this.contexts;
        while (contexts.length > 0) {
            var context = contexts.shift();
            context.subscription.unsubscribe();
            context.buffer = null;
            context.subscription = null;
        }
        this.contexts = null;
        OuterSubscriber$$1.prototype._error.call(this, err);
    };
    BufferToggleSubscriber.prototype._complete = function _complete () {
        var this$1 = this;

        var contexts = this.contexts;
        while (contexts.length > 0) {
            var context = contexts.shift();
            this$1.destination.next(context.buffer);
            context.subscription.unsubscribe();
            context.buffer = null;
            context.subscription = null;
        }
        this.contexts = null;
        OuterSubscriber$$1.prototype._complete.call(this);
    };
    BufferToggleSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        outerValue ? this.closeBuffer(outerValue) : this.openBuffer(innerValue);
    };
    BufferToggleSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        this.closeBuffer(innerSub.context);
    };
    BufferToggleSubscriber.prototype.openBuffer = function openBuffer (value) {
        try {
            var closingSelector = this.closingSelector;
            var closingNotifier = closingSelector.call(this, value);
            if (closingNotifier) {
                this.trySubscribe(closingNotifier);
            }
        }
        catch (err) {
            this._error(err);
        }
    };
    BufferToggleSubscriber.prototype.closeBuffer = function closeBuffer (context) {
        var contexts = this.contexts;
        if (contexts && context) {
            var buffer = context.buffer;
            var subscription = context.subscription;
            this.destination.next(buffer);
            contexts.splice(contexts.indexOf(context), 1);
            this.remove(subscription);
            subscription.unsubscribe();
        }
    };
    BufferToggleSubscriber.prototype.trySubscribe = function trySubscribe (closingNotifier) {
        var contexts = this.contexts;
        var buffer = [];
        var subscription = new Subscription();
        var context = { buffer: buffer, subscription: subscription };
        contexts.push(context);
        var innerSubscription = subscribeToResult(this, closingNotifier, context);
        if (!innerSubscription || innerSubscription.closed) {
            this.closeBuffer(context);
        }
        else {
            innerSubscription.context = context;
            this.add(innerSubscription);
            subscription.add(innerSubscription);
        }
    };

    return BufferToggleSubscriber;
}(OuterSubscriber));

Observable.prototype.bufferToggle = bufferToggle;

/**
 * Buffers the source Observable values, using a factory function of closing
 * Observables to determine when to close, emit, and reset the buffer.
 *
 * <span class="informal">Collects values from the past as an array. When it
 * starts collecting values, it calls a function that returns an Observable that
 * tells when to close the buffer and restart collecting.</span>
 *
 * <img src="./img/bufferWhen.png" width="100%">
 *
 * Opens a buffer immediately, then closes the buffer when the observable
 * returned by calling `closingSelector` function emits a value. When it closes
 * the buffer, it immediately opens a new buffer and repeats the process.
 *
 * @example <caption>Emit an array of the last clicks every [1-5] random seconds</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var buffered = clicks.bufferWhen(() =>
 *   Rx.Observable.interval(1000 + Math.random() * 4000)
 * );
 * buffered.subscribe(x => console.log(x));
 *
 * @see {@link buffer}
 * @see {@link bufferCount}
 * @see {@link bufferTime}
 * @see {@link bufferToggle}
 * @see {@link windowWhen}
 *
 * @param {function(): Observable} closingSelector A function that takes no
 * arguments and returns an Observable that signals buffer closure.
 * @return {Observable<T[]>} An observable of arrays of buffered values.
 * @method bufferWhen
 * @owner Observable
 */
function bufferWhen(closingSelector) {
    return this.lift(new BufferWhenOperator(closingSelector));
}
var BufferWhenOperator = function BufferWhenOperator(closingSelector) {
    this.closingSelector = closingSelector;
};
BufferWhenOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new BufferWhenSubscriber(subscriber, this.closingSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var BufferWhenSubscriber = (function (OuterSubscriber$$1) {
    function BufferWhenSubscriber(destination, closingSelector) {
        OuterSubscriber$$1.call(this, destination);
        this.closingSelector = closingSelector;
        this.subscribing = false;
        this.openBuffer();
    }

    if ( OuterSubscriber$$1 ) BufferWhenSubscriber.__proto__ = OuterSubscriber$$1;
    BufferWhenSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    BufferWhenSubscriber.prototype.constructor = BufferWhenSubscriber;
    BufferWhenSubscriber.prototype._next = function _next (value) {
        this.buffer.push(value);
    };
    BufferWhenSubscriber.prototype._complete = function _complete () {
        var buffer = this.buffer;
        if (buffer) {
            this.destination.next(buffer);
        }
        OuterSubscriber$$1.prototype._complete.call(this);
    };
    BufferWhenSubscriber.prototype._unsubscribe = function _unsubscribe () {
        this.buffer = null;
        this.subscribing = false;
    };
    BufferWhenSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.openBuffer();
    };
    BufferWhenSubscriber.prototype.notifyComplete = function notifyComplete () {
        if (this.subscribing) {
            this.complete();
        }
        else {
            this.openBuffer();
        }
    };
    BufferWhenSubscriber.prototype.openBuffer = function openBuffer () {
        var ref = this;
        var closingSubscription = ref.closingSubscription;
        if (closingSubscription) {
            this.remove(closingSubscription);
            closingSubscription.unsubscribe();
        }
        var buffer = this.buffer;
        if (this.buffer) {
            this.destination.next(buffer);
        }
        this.buffer = [];
        var closingNotifier = tryCatch(this.closingSelector)();
        if (closingNotifier === errorObject) {
            this.error(errorObject.e);
        }
        else {
            closingSubscription = new Subscription();
            this.closingSubscription = closingSubscription;
            this.add(closingSubscription);
            this.subscribing = true;
            closingSubscription.add(subscribeToResult(this, closingNotifier));
            this.subscribing = false;
        }
    };

    return BufferWhenSubscriber;
}(OuterSubscriber));

Observable.prototype.bufferWhen = bufferWhen;

/**
 * @param bufferSize
 * @param windowTime
 * @param scheduler
 * @return {Observable<any>}
 * @method cache
 * @owner Observable
 */
function cache(bufferSize, windowTime, scheduler) {
    if ( bufferSize === void 0 ) bufferSize = Number.POSITIVE_INFINITY;
    if ( windowTime === void 0 ) windowTime = Number.POSITIVE_INFINITY;

    var subject;
    var source = this;
    var refs = 0;
    var outerSub;
    var getSubject = function () {
        subject = new ReplaySubject(bufferSize, windowTime, scheduler);
        return subject;
    };
    return new Observable(function (observer) {
        if (!subject) {
            subject = getSubject();
            outerSub = source.subscribe(function (value) { return subject.next(value); }, function (err) {
                var s = subject;
                subject = null;
                s.error(err);
            }, function () { return subject.complete(); });
        }
        refs++;
        if (!subject) {
            subject = getSubject();
        }
        var innerSub = subject.subscribe(observer);
        return function () {
            refs--;
            if (innerSub) {
                innerSub.unsubscribe();
            }
            if (refs === 0) {
                outerSub.unsubscribe();
            }
        };
    });
}

Observable.prototype.cache = cache;

/**
 * Catches errors on the observable to be handled by returning a new observable or throwing an error.
 * @param {function} selector a function that takes as arguments `err`, which is the error, and `caught`, which
 *  is the source observable, in case you'd like to "retry" that observable by returning it again. Whatever observable
 *  is returned by the `selector` will be used to continue the observable chain.
 * @return {Observable} an observable that originates from either the source or the observable returned by the
 *  catch `selector` function.
 * @method catch
 * @owner Observable
 */
function _catch(selector) {
    var operator = new CatchOperator(selector);
    var caught = this.lift(operator);
    return (operator.caught = caught);
}
var CatchOperator = function CatchOperator(selector) {
    this.selector = selector;
};
CatchOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new CatchSubscriber(subscriber, this.selector, this.caught));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var CatchSubscriber = (function (OuterSubscriber$$1) {
    function CatchSubscriber(destination, selector, caught) {
        OuterSubscriber$$1.call(this, destination);
        this.selector = selector;
        this.caught = caught;
    }

    if ( OuterSubscriber$$1 ) CatchSubscriber.__proto__ = OuterSubscriber$$1;
    CatchSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    CatchSubscriber.prototype.constructor = CatchSubscriber;
    // NOTE: overriding `error` instead of `_error` because we don't want
    // to have this flag this subscriber as `isStopped`.
    CatchSubscriber.prototype.error = function error (err) {
        if (!this.isStopped) {
            var result;
            try {
                result = this.selector(err, this.caught);
            }
            catch (err) {
                this.destination.error(err);
                return;
            }
            this.unsubscribe();
            this.destination.remove(this);
            subscribeToResult(this, result);
        }
    };

    return CatchSubscriber;
}(OuterSubscriber));

Observable.prototype.catch = _catch;
Observable.prototype._catch = _catch;

/**
 * Converts a higher-order Observable into a first-order Observable by waiting
 * for the outer Observable to complete, then applying {@link combineLatest}.
 *
 * <span class="informal">Flattens an Observable-of-Observables by applying
 * {@link combineLatest} when the Observable-of-Observables completes.</span>
 *
 * <img src="./img/combineAll.png" width="100%">
 *
 * Takes an Observable of Observables, and collects all Observables from it.
 * Once the outer Observable completes, it subscribes to all collected
 * Observables and combines their values using the {@link combineLatest}
 * strategy, such that:
 * - Every time an inner Observable emits, the output Observable emits.
 * - When the returned observable emits, it emits all of the latest values by:
 *   - If a `project` function is provided, it is called with each recent value
 *     from each inner Observable in whatever order they arrived, and the result
 *     of the `project` function is what is emitted by the output Observable.
 *   - If there is no `project` function, an array of all of the most recent
 *     values is emitted by the output Observable.
 *
 * @example <caption>Map two click events to a finite interval Observable, then apply combineAll</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var higherOrder = clicks.map(ev =>
 *   Rx.Observable.interval(Math.random()*2000).take(3)
 * ).take(2);
 * var result = higherOrder.combineAll();
 * result.subscribe(x => console.log(x));
 *
 * @see {@link combineLatest}
 * @see {@link mergeAll}
 *
 * @param {function} [project] An optional function to map the most recent
 * values from each inner Observable into a new result. Takes each of the most
 * recent values from each collected inner Observable as arguments, in order.
 * @return {Observable} An Observable of projected results or arrays of recent
 * values.
 * @method combineAll
 * @owner Observable
 */
function combineAll(project) {
    return this.lift(new CombineLatestOperator(project));
}

Observable.prototype.combineAll = combineAll;

Observable.prototype.combineLatest = combineLatest$1;

Observable.prototype.concat = concat$1;

/**
 * Converts a higher-order Observable into a first-order Observable by
 * concatenating the inner Observables in order.
 *
 * <span class="informal">Flattens an Observable-of-Observables by putting one
 * inner Observable after the other.</span>
 *
 * <img src="./img/concatAll.png" width="100%">
 *
 * Joins every Observable emitted by the source (a higher-order Observable), in
 * a serial fashion. It subscribes to each inner Observable only after the
 * previous inner Observable has completed, and merges all of their values into
 * the returned observable.
 *
 * __Warning:__ If the source Observable emits Observables quickly and
 * endlessly, and the inner Observables it emits generally complete slower than
 * the source emits, you can run into memory issues as the incoming Observables
 * collect in an unbounded buffer.
 *
 * Note: `concatAll` is equivalent to `mergeAll` with concurrency parameter set
 * to `1`.
 *
 * @example <caption>For each click event, tick every second from 0 to 3, with no concurrency</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var higherOrder = clicks.map(ev => Rx.Observable.interval(1000).take(4));
 * var firstOrder = higherOrder.concatAll();
 * firstOrder.subscribe(x => console.log(x));
 *
 * @see {@link combineAll}
 * @see {@link concat}
 * @see {@link concatMap}
 * @see {@link concatMapTo}
 * @see {@link exhaust}
 * @see {@link mergeAll}
 * @see {@link switch}
 * @see {@link zipAll}
 *
 * @return {Observable} An Observable emitting values from all the inner
 * Observables concatenated.
 * @method concatAll
 * @owner Observable
 */
function concatAll() {
    return this.lift(new MergeAllOperator(1));
}

Observable.prototype.concatAll = concatAll;

/**
 * Projects each source value to an Observable which is merged in the output
 * Observable.
 *
 * <span class="informal">Maps each value to an Observable, then flattens all of
 * these inner Observables using {@link mergeAll}.</span>
 *
 * <img src="./img/mergeMap.png" width="100%">
 *
 * Returns an Observable that emits items based on applying a function that you
 * supply to each item emitted by the source Observable, where that function
 * returns an Observable, and then merging those resulting Observables and
 * emitting the results of this merger.
 *
 * @example <caption>Map and flatten each letter to an Observable ticking every 1 second</caption>
 * var letters = Rx.Observable.of('a', 'b', 'c');
 * var result = letters.mergeMap(x =>
 *   Rx.Observable.interval(1000).map(i => x+i)
 * );
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concatMap}
 * @see {@link exhaustMap}
 * @see {@link merge}
 * @see {@link mergeAll}
 * @see {@link mergeMapTo}
 * @see {@link mergeScan}
 * @see {@link switchMap}
 *
 * @param {function(value: T, ?index: number): Observable} project A function
 * that, when applied to an item emitted by the source Observable, returns an
 * Observable.
 * @param {function(outerValue: T, innerValue: I, outerIndex: number, innerIndex: number): any} [resultSelector]
 * A function to produce the value on the output Observable based on the values
 * and the indices of the source (outer) emission and the inner Observable
 * emission. The arguments passed to this function are:
 * - `outerValue`: the value that came from the source
 * - `innerValue`: the value that came from the projected Observable
 * - `outerIndex`: the "index" of the value that came from the source
 * - `innerIndex`: the "index" of the value from the projected Observable
 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of input
 * Observables being subscribed to concurrently.
 * @return {Observable} An Observable that emits the result of applying the
 * projection function (and the optional `resultSelector`) to each item emitted
 * by the source Observable and merging the results of the Observables obtained
 * from this transformation.
 * @method mergeMap
 * @owner Observable
 */
function mergeMap(project, resultSelector, concurrent) {
    if ( concurrent === void 0 ) concurrent = Number.POSITIVE_INFINITY;

    if (typeof resultSelector === 'number') {
        concurrent = resultSelector;
        resultSelector = null;
    }
    return this.lift(new MergeMapOperator(project, resultSelector, concurrent));
}
var MergeMapOperator = function MergeMapOperator(project, resultSelector, concurrent) {
    if ( concurrent === void 0 ) concurrent = Number.POSITIVE_INFINITY;

    this.project = project;
    this.resultSelector = resultSelector;
    this.concurrent = concurrent;
};
MergeMapOperator.prototype.call = function call (observer, source) {
    return source._subscribe(new MergeMapSubscriber(observer, this.project, this.resultSelector, this.concurrent));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var MergeMapSubscriber = (function (OuterSubscriber$$1) {
    function MergeMapSubscriber(destination, project, resultSelector, concurrent) {
        if ( concurrent === void 0 ) concurrent = Number.POSITIVE_INFINITY;

        OuterSubscriber$$1.call(this, destination);
        this.project = project;
        this.resultSelector = resultSelector;
        this.concurrent = concurrent;
        this.hasCompleted = false;
        this.buffer = [];
        this.active = 0;
        this.index = 0;
    }

    if ( OuterSubscriber$$1 ) MergeMapSubscriber.__proto__ = OuterSubscriber$$1;
    MergeMapSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    MergeMapSubscriber.prototype.constructor = MergeMapSubscriber;
    MergeMapSubscriber.prototype._next = function _next (value) {
        if (this.active < this.concurrent) {
            this._tryNext(value);
        }
        else {
            this.buffer.push(value);
        }
    };
    MergeMapSubscriber.prototype._tryNext = function _tryNext (value) {
        var result;
        var index = this.index++;
        try {
            result = this.project(value, index);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.active++;
        this._innerSub(result, value, index);
    };
    MergeMapSubscriber.prototype._innerSub = function _innerSub (ish, value, index) {
        this.add(subscribeToResult(this, ish, value, index));
    };
    MergeMapSubscriber.prototype._complete = function _complete () {
        this.hasCompleted = true;
        if (this.active === 0 && this.buffer.length === 0) {
            this.destination.complete();
        }
    };
    MergeMapSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        if (this.resultSelector) {
            this._notifyResultSelector(outerValue, innerValue, outerIndex, innerIndex);
        }
        else {
            this.destination.next(innerValue);
        }
    };
    MergeMapSubscriber.prototype._notifyResultSelector = function _notifyResultSelector (outerValue, innerValue, outerIndex, innerIndex) {
        var result;
        try {
            result = this.resultSelector(outerValue, innerValue, outerIndex, innerIndex);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.destination.next(result);
    };
    MergeMapSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        var buffer = this.buffer;
        this.remove(innerSub);
        this.active--;
        if (buffer.length > 0) {
            this._next(buffer.shift());
        }
        else if (this.active === 0 && this.hasCompleted) {
            this.destination.complete();
        }
    };

    return MergeMapSubscriber;
}(OuterSubscriber));

/**
 * Projects each source value to an Observable which is merged in the output
 * Observable, in a serialized fashion waiting for each one to complete before
 * merging the next.
 *
 * <span class="informal">Maps each value to an Observable, then flattens all of
 * these inner Observables using {@link concatAll}.</span>
 *
 * <img src="./img/concatMap.png" width="100%">
 *
 * Returns an Observable that emits items based on applying a function that you
 * supply to each item emitted by the source Observable, where that function
 * returns an (so-called "inner") Observable. Each new inner Observable is
 * concatenated with the previous inner Observable.
 *
 * __Warning:__ if source values arrive endlessly and faster than their
 * corresponding inner Observables can complete, it will result in memory issues
 * as inner Observables amass in an unbounded buffer waiting for their turn to
 * be subscribed to.
 *
 * Note: `concatMap` is equivalent to `mergeMap` with concurrency parameter set
 * to `1`.
 *
 * @example <caption>For each click event, tick every second from 0 to 3, with no concurrency</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.concatMap(ev => Rx.Observable.interval(1000).take(4));
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concat}
 * @see {@link concatAll}
 * @see {@link concatMapTo}
 * @see {@link exhaustMap}
 * @see {@link mergeMap}
 * @see {@link switchMap}
 *
 * @param {function(value: T, ?index: number): Observable} project A function
 * that, when applied to an item emitted by the source Observable, returns an
 * Observable.
 * @param {function(outerValue: T, innerValue: I, outerIndex: number, innerIndex: number): any} [resultSelector]
 * A function to produce the value on the output Observable based on the values
 * and the indices of the source (outer) emission and the inner Observable
 * emission. The arguments passed to this function are:
 * - `outerValue`: the value that came from the source
 * - `innerValue`: the value that came from the projected Observable
 * - `outerIndex`: the "index" of the value that came from the source
 * - `innerIndex`: the "index" of the value from the projected Observable
 * @return {Observable} an observable of values merged from the projected
 * Observables as they were subscribed to, one at a time. Optionally, these
 * values may have been projected from a passed `projectResult` argument.
 * @return {Observable} An Observable that emits the result of applying the
 * projection function (and the optional `resultSelector`) to each item emitted
 * by the source Observable and taking values from each projected inner
 * Observable sequentially.
 * @method concatMap
 * @owner Observable
 */
function concatMap(project, resultSelector) {
    return this.lift(new MergeMapOperator(project, resultSelector, 1));
}

Observable.prototype.concatMap = concatMap;

/**
 * Projects each source value to the same Observable which is merged multiple
 * times in the output Observable.
 *
 * <span class="informal">It's like {@link mergeMap}, but maps each value always
 * to the same inner Observable.</span>
 *
 * <img src="./img/mergeMapTo.png" width="100%">
 *
 * Maps each source value to the given Observable `innerObservable` regardless
 * of the source value, and then merges those resulting Observables into one
 * single Observable, which is the output Observable.
 *
 * @example <caption>For each click event, start an interval Observable ticking every 1 second</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.mergeMapTo(Rx.Observable.interval(1000));
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concatMapTo}
 * @see {@link merge}
 * @see {@link mergeAll}
 * @see {@link mergeMap}
 * @see {@link mergeScan}
 * @see {@link switchMapTo}
 *
 * @param {Observable} innerObservable An Observable to replace each value from
 * the source Observable.
 * @param {function(outerValue: T, innerValue: I, outerIndex: number, innerIndex: number): any} [resultSelector]
 * A function to produce the value on the output Observable based on the values
 * and the indices of the source (outer) emission and the inner Observable
 * emission. The arguments passed to this function are:
 * - `outerValue`: the value that came from the source
 * - `innerValue`: the value that came from the projected Observable
 * - `outerIndex`: the "index" of the value that came from the source
 * - `innerIndex`: the "index" of the value from the projected Observable
 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of input
 * Observables being subscribed to concurrently.
 * @return {Observable} An Observable that emits items from the given
 * `innerObservable` (and optionally transformed through `resultSelector`) every
 * time a value is emitted on the source Observable.
 * @method mergeMapTo
 * @owner Observable
 */
function mergeMapTo(innerObservable, resultSelector, concurrent) {
    if ( concurrent === void 0 ) concurrent = Number.POSITIVE_INFINITY;

    if (typeof resultSelector === 'number') {
        concurrent = resultSelector;
        resultSelector = null;
    }
    return this.lift(new MergeMapToOperator(innerObservable, resultSelector, concurrent));
}
// TODO: Figure out correct signature here: an Operator<Observable<T>, R>
//       needs to implement call(observer: Subscriber<R>): Subscriber<Observable<T>>
var MergeMapToOperator = function MergeMapToOperator(ish, resultSelector, concurrent) {
    if ( concurrent === void 0 ) concurrent = Number.POSITIVE_INFINITY;

    this.ish = ish;
    this.resultSelector = resultSelector;
    this.concurrent = concurrent;
};
MergeMapToOperator.prototype.call = function call (observer, source) {
    return source._subscribe(new MergeMapToSubscriber(observer, this.ish, this.resultSelector, this.concurrent));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var MergeMapToSubscriber = (function (OuterSubscriber$$1) {
    function MergeMapToSubscriber(destination, ish, resultSelector, concurrent) {
        if ( concurrent === void 0 ) concurrent = Number.POSITIVE_INFINITY;

        OuterSubscriber$$1.call(this, destination);
        this.ish = ish;
        this.resultSelector = resultSelector;
        this.concurrent = concurrent;
        this.hasCompleted = false;
        this.buffer = [];
        this.active = 0;
        this.index = 0;
    }

    if ( OuterSubscriber$$1 ) MergeMapToSubscriber.__proto__ = OuterSubscriber$$1;
    MergeMapToSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    MergeMapToSubscriber.prototype.constructor = MergeMapToSubscriber;
    MergeMapToSubscriber.prototype._next = function _next (value) {
        if (this.active < this.concurrent) {
            var resultSelector = this.resultSelector;
            var index = this.index++;
            var ish = this.ish;
            var destination = this.destination;
            this.active++;
            this._innerSub(ish, destination, resultSelector, value, index);
        }
        else {
            this.buffer.push(value);
        }
    };
    MergeMapToSubscriber.prototype._innerSub = function _innerSub (ish, destination, resultSelector, value, index) {
        this.add(subscribeToResult(this, ish, value, index));
    };
    MergeMapToSubscriber.prototype._complete = function _complete () {
        this.hasCompleted = true;
        if (this.active === 0 && this.buffer.length === 0) {
            this.destination.complete();
        }
    };
    MergeMapToSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        var ref = this;
        var resultSelector = ref.resultSelector;
        var destination = ref.destination;
        if (resultSelector) {
            this.trySelectResult(outerValue, innerValue, outerIndex, innerIndex);
        }
        else {
            destination.next(innerValue);
        }
    };
    MergeMapToSubscriber.prototype.trySelectResult = function trySelectResult (outerValue, innerValue, outerIndex, innerIndex) {
        var ref = this;
        var resultSelector = ref.resultSelector;
        var destination = ref.destination;
        var result;
        try {
            result = resultSelector(outerValue, innerValue, outerIndex, innerIndex);
        }
        catch (err) {
            destination.error(err);
            return;
        }
        destination.next(result);
    };
    MergeMapToSubscriber.prototype.notifyError = function notifyError (err) {
        this.destination.error(err);
    };
    MergeMapToSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        var buffer = this.buffer;
        this.remove(innerSub);
        this.active--;
        if (buffer.length > 0) {
            this._next(buffer.shift());
        }
        else if (this.active === 0 && this.hasCompleted) {
            this.destination.complete();
        }
    };

    return MergeMapToSubscriber;
}(OuterSubscriber));

/**
 * Projects each source value to the same Observable which is merged multiple
 * times in a serialized fashion on the output Observable.
 *
 * <span class="informal">It's like {@link concatMap}, but maps each value
 * always to the same inner Observable.</span>
 *
 * <img src="./img/concatMapTo.png" width="100%">
 *
 * Maps each source value to the given Observable `innerObservable` regardless
 * of the source value, and then flattens those resulting Observables into one
 * single Observable, which is the output Observable. Each new `innerObservable`
 * instance emitted on the output Observable is concatenated with the previous
 * `innerObservable` instance.
 *
 * __Warning:__ if source values arrive endlessly and faster than their
 * corresponding inner Observables can complete, it will result in memory issues
 * as inner Observables amass in an unbounded buffer waiting for their turn to
 * be subscribed to.
 *
 * Note: `concatMapTo` is equivalent to `mergeMapTo` with concurrency parameter
 * set to `1`.
 *
 * @example <caption>For each click event, tick every second from 0 to 3, with no concurrency</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.concatMapTo(Rx.Observable.interval(1000).take(4));
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concat}
 * @see {@link concatAll}
 * @see {@link concatMap}
 * @see {@link mergeMapTo}
 * @see {@link switchMapTo}
 *
 * @param {Observable} innerObservable An Observable to replace each value from
 * the source Observable.
 * @param {function(outerValue: T, innerValue: I, outerIndex: number, innerIndex: number): any} [resultSelector]
 * A function to produce the value on the output Observable based on the values
 * and the indices of the source (outer) emission and the inner Observable
 * emission. The arguments passed to this function are:
 * - `outerValue`: the value that came from the source
 * - `innerValue`: the value that came from the projected Observable
 * - `outerIndex`: the "index" of the value that came from the source
 * - `innerIndex`: the "index" of the value from the projected Observable
 * @return {Observable} An observable of values merged together by joining the
 * passed observable with itself, one after the other, for each value emitted
 * from the source.
 * @method concatMapTo
 * @owner Observable
 */
function concatMapTo(innerObservable, resultSelector) {
    return this.lift(new MergeMapToOperator(innerObservable, resultSelector, 1));
}

Observable.prototype.concatMapTo = concatMapTo;

/**
 * Counts the number of emissions on the source and emits that number when the
 * source completes.
 *
 * <span class="informal">Tells how many values were emitted, when the source
 * completes.</span>
 *
 * <img src="./img/count.png" width="100%">
 *
 * `count` transforms an Observable that emits values into an Observable that
 * emits a single value that represents the number of values emitted by the
 * source Observable. If the source Observable terminates with an error, `count`
 * will pass this error notification along without emitting an value first. If
 * the source Observable does not terminate at all, `count` will neither emit
 * a value nor terminate. This operator takes an optional `predicate` function
 * as argument, in which case the output emission will represent the number of
 * source values that matched `true` with the `predicate`.
 *
 * @example <caption>Counts how many seconds have passed before the first click happened</caption>
 * var seconds = Rx.Observable.interval(1000);
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var secondsBeforeClick = seconds.takeUntil(clicks);
 * var result = secondsBeforeClick.count();
 * result.subscribe(x => console.log(x));
 *
 * @example <caption>Counts how many odd numbers are there between 1 and 7</caption>
 * var numbers = Rx.Observable.range(1, 7);
 * var result = numbers.count(i => i % 2 === 1);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link max}
 * @see {@link min}
 * @see {@link reduce}
 *
 * @param {function(value: T, i: number, source: Observable<T>): boolean} [predicate] A
 * boolean function to select what values are to be counted. It is provided with
 * arguments of:
 * - `value`: the value from the source Observable.
 * - `index`: the (zero-based) "index" of the value from the source Observable.
 * - `source`: the source Observable instance itself.
 * @return {Observable} An Observable of one number that represents the count as
 * described above.
 * @method count
 * @owner Observable
 */
function count(predicate) {
    return this.lift(new CountOperator(predicate, this));
}
var CountOperator = function CountOperator(predicate, source) {
    this.predicate = predicate;
    this.source = source;
};
CountOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new CountSubscriber(subscriber, this.predicate, this.source));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var CountSubscriber = (function (Subscriber$$1) {
    function CountSubscriber(destination, predicate, source) {
        Subscriber$$1.call(this, destination);
        this.predicate = predicate;
        this.source = source;
        this.count = 0;
        this.index = 0;
    }

    if ( Subscriber$$1 ) CountSubscriber.__proto__ = Subscriber$$1;
    CountSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    CountSubscriber.prototype.constructor = CountSubscriber;
    CountSubscriber.prototype._next = function _next (value) {
        if (this.predicate) {
            this._tryPredicate(value);
        }
        else {
            this.count++;
        }
    };
    CountSubscriber.prototype._tryPredicate = function _tryPredicate (value) {
        var result;
        try {
            result = this.predicate(value, this.index++, this.source);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        if (result) {
            this.count++;
        }
    };
    CountSubscriber.prototype._complete = function _complete () {
        this.destination.next(this.count);
        this.destination.complete();
    };

    return CountSubscriber;
}(Subscriber));

Observable.prototype.count = count;

/**
 * Converts an Observable of {@link Notification} objects into the emissions
 * that they represent.
 *
 * <span class="informal">Unwraps {@link Notification} objects as actual `next`,
 * `error` and `complete` emissions. The opposite of {@link materialize}.</span>
 *
 * <img src="./img/dematerialize.png" width="100%">
 *
 * `dematerialize` is assumed to operate an Observable that only emits
 * {@link Notification} objects as `next` emissions, and does not emit any
 * `error`. Such Observable is the output of a `materialize` operation. Those
 * notifications are then unwrapped using the metadata they contain, and emitted
 * as `next`, `error`, and `complete` on the output Observable.
 *
 * Use this operator in conjunction with {@link materialize}.
 *
 * @example <caption>Convert an Observable of Notifications to an actual Observable</caption>
 * var notifA = new Rx.Notification('N', 'A');
 * var notifB = new Rx.Notification('N', 'B');
 * var notifE = new Rx.Notification('E', void 0,
 *   new TypeError('x.toUpperCase is not a function')
 * );
 * var materialized = Rx.Observable.of(notifA, notifB, notifE);
 * var upperCase = materialized.dematerialize();
 * upperCase.subscribe(x => console.log(x), e => console.error(e));
 *
 * @see {@link Notification}
 * @see {@link materialize}
 *
 * @return {Observable} An Observable that emits items and notifications
 * embedded in Notification objects emitted by the source Observable.
 * @method dematerialize
 * @owner Observable
 */
function dematerialize() {
    return this.lift(new DeMaterializeOperator());
}
var DeMaterializeOperator = function DeMaterializeOperator () {};

DeMaterializeOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new DeMaterializeSubscriber(subscriber));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var DeMaterializeSubscriber = (function (Subscriber$$1) {
    function DeMaterializeSubscriber(destination) {
        Subscriber$$1.call(this, destination);
    }

    if ( Subscriber$$1 ) DeMaterializeSubscriber.__proto__ = Subscriber$$1;
    DeMaterializeSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    DeMaterializeSubscriber.prototype.constructor = DeMaterializeSubscriber;
    DeMaterializeSubscriber.prototype._next = function _next (value) {
        value.observe(this.destination);
    };

    return DeMaterializeSubscriber;
}(Subscriber));

Observable.prototype.dematerialize = dematerialize;

/**
 * Emits a value from the source Observable only after a particular time span
 * determined by another Observable has passed without another source emission.
 *
 * <span class="informal">It's like {@link debounceTime}, but the time span of
 * emission silence is determined by a second Observable.</span>
 *
 * <img src="./img/debounce.png" width="100%">
 *
 * `debounce` delays values emitted by the source Observable, but drops previous
 * pending delayed emissions if a new value arrives on the source Observable.
 * This operator keeps track of the most recent value from the source
 * Observable, and spawns a duration Observable by calling the
 * `durationSelector` function. The value is emitted only when the duration
 * Observable emits a value or completes, and if no other value was emitted on
 * the source Observable since the duration Observable was spawned. If a new
 * value appears before the duration Observable emits, the previous value will
 * be dropped and will not be emitted on the output Observable.
 *
 * Like {@link debounceTime}, this is a rate-limiting operator, and also a
 * delay-like operator since output emissions do not necessarily occur at the
 * same time as they did on the source Observable.
 *
 * @example <caption>Emit the most recent click after a burst of clicks</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.debounce(() => Rx.Observable.interval(1000));
 * result.subscribe(x => console.log(x));
 *
 * @see {@link audit}
 * @see {@link debounceTime}
 * @see {@link delayWhen}
 * @see {@link throttle}
 *
 * @param {function(value: T): Observable|Promise} durationSelector A function
 * that receives a value from the source Observable, for computing the timeout
 * duration for each source value, returned as an Observable or a Promise.
 * @return {Observable} An Observable that delays the emissions of the source
 * Observable by the specified duration Observable returned by
 * `durationSelector`, and may drop some values if they occur too frequently.
 * @method debounce
 * @owner Observable
 */
function debounce(durationSelector) {
    return this.lift(new DebounceOperator(durationSelector));
}
var DebounceOperator = function DebounceOperator(durationSelector) {
    this.durationSelector = durationSelector;
};
DebounceOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new DebounceSubscriber(subscriber, this.durationSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var DebounceSubscriber = (function (OuterSubscriber$$1) {
    function DebounceSubscriber(destination, durationSelector) {
        OuterSubscriber$$1.call(this, destination);
        this.durationSelector = durationSelector;
        this.hasValue = false;
        this.durationSubscription = null;
    }

    if ( OuterSubscriber$$1 ) DebounceSubscriber.__proto__ = OuterSubscriber$$1;
    DebounceSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    DebounceSubscriber.prototype.constructor = DebounceSubscriber;
    DebounceSubscriber.prototype._next = function _next (value) {
        try {
            var result = this.durationSelector.call(this, value);
            if (result) {
                this._tryNext(value, result);
            }
        }
        catch (err) {
            this.destination.error(err);
        }
    };
    DebounceSubscriber.prototype._complete = function _complete () {
        this.emitValue();
        this.destination.complete();
    };
    DebounceSubscriber.prototype._tryNext = function _tryNext (value, duration) {
        var subscription = this.durationSubscription;
        this.value = value;
        this.hasValue = true;
        if (subscription) {
            subscription.unsubscribe();
            this.remove(subscription);
        }
        subscription = subscribeToResult(this, duration);
        if (!subscription.closed) {
            this.add(this.durationSubscription = subscription);
        }
    };
    DebounceSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.emitValue();
    };
    DebounceSubscriber.prototype.notifyComplete = function notifyComplete () {
        this.emitValue();
    };
    DebounceSubscriber.prototype.emitValue = function emitValue () {
        if (this.hasValue) {
            var value = this.value;
            var subscription = this.durationSubscription;
            if (subscription) {
                this.durationSubscription = null;
                subscription.unsubscribe();
                this.remove(subscription);
            }
            this.value = null;
            this.hasValue = false;
            OuterSubscriber$$1.prototype._next.call(this, value);
        }
    };

    return DebounceSubscriber;
}(OuterSubscriber));

Observable.prototype.debounce = debounce;

/**
 * Emits a value from the source Observable only after a particular time span
 * has passed without another source emission.
 *
 * <span class="informal">It's like {@link delay}, but passes only the most
 * recent value from each burst of emissions.</span>
 *
 * <img src="./img/debounceTime.png" width="100%">
 *
 * `debounceTime` delays values emitted by the source Observable, but drops
 * previous pending delayed emissions if a new value arrives on the source
 * Observable. This operator keeps track of the most recent value from the
 * source Observable, and emits that only when `dueTime` enough time has passed
 * without any other value appearing on the source Observable. If a new value
 * appears before `dueTime` silence occurs, the previous value will be dropped
 * and will not be emitted on the output Observable.
 *
 * This is a rate-limiting operator, because it is impossible for more than one
 * value to be emitted in any time window of duration `dueTime`, but it is also
 * a delay-like operator since output emissions do not occur at the same time as
 * they did on the source Observable. Optionally takes a {@link Scheduler} for
 * managing timers.
 *
 * @example <caption>Emit the most recent click after a burst of clicks</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.debounceTime(1000);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link auditTime}
 * @see {@link debounce}
 * @see {@link delay}
 * @see {@link sampleTime}
 * @see {@link throttleTime}
 *
 * @param {number} dueTime The timeout duration in milliseconds (or the time
 * unit determined internally by the optional `scheduler`) for the window of
 * time required to wait for emission silence before emitting the most recent
 * source value.
 * @param {Scheduler} [scheduler=async] The {@link Scheduler} to use for
 * managing the timers that handle the timeout for each value.
 * @return {Observable} An Observable that delays the emissions of the source
 * Observable by the specified `dueTime`, and may drop some values if they occur
 * too frequently.
 * @method debounceTime
 * @owner Observable
 */
function debounceTime(dueTime, scheduler) {
    if ( scheduler === void 0 ) scheduler = async;

    return this.lift(new DebounceTimeOperator(dueTime, scheduler));
}
var DebounceTimeOperator = function DebounceTimeOperator(dueTime, scheduler) {
    this.dueTime = dueTime;
    this.scheduler = scheduler;
};
DebounceTimeOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new DebounceTimeSubscriber(subscriber, this.dueTime, this.scheduler));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var DebounceTimeSubscriber = (function (Subscriber$$1) {
    function DebounceTimeSubscriber(destination, dueTime, scheduler) {
        Subscriber$$1.call(this, destination);
        this.dueTime = dueTime;
        this.scheduler = scheduler;
        this.debouncedSubscription = null;
        this.lastValue = null;
        this.hasValue = false;
    }

    if ( Subscriber$$1 ) DebounceTimeSubscriber.__proto__ = Subscriber$$1;
    DebounceTimeSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    DebounceTimeSubscriber.prototype.constructor = DebounceTimeSubscriber;
    DebounceTimeSubscriber.prototype._next = function _next (value) {
        this.clearDebounce();
        this.lastValue = value;
        this.hasValue = true;
        this.add(this.debouncedSubscription = this.scheduler.schedule(dispatchNext$3, this.dueTime, this));
    };
    DebounceTimeSubscriber.prototype._complete = function _complete () {
        this.debouncedNext();
        this.destination.complete();
    };
    DebounceTimeSubscriber.prototype.debouncedNext = function debouncedNext () {
        this.clearDebounce();
        if (this.hasValue) {
            this.destination.next(this.lastValue);
            this.lastValue = null;
            this.hasValue = false;
        }
    };
    DebounceTimeSubscriber.prototype.clearDebounce = function clearDebounce () {
        var debouncedSubscription = this.debouncedSubscription;
        if (debouncedSubscription !== null) {
            this.remove(debouncedSubscription);
            debouncedSubscription.unsubscribe();
            this.debouncedSubscription = null;
        }
    };

    return DebounceTimeSubscriber;
}(Subscriber));
function dispatchNext$3(subscriber) {
    subscriber.debouncedNext();
}

Observable.prototype.debounceTime = debounceTime;

/**
 * Emits a given value if the source Observable completes without emitting any
 * `next` value, otherwise mirrors the source Observable.
 *
 * <span class="informal">If the source Observable turns out to be empty, then
 * this operator will emit a default value.</span>
 *
 * <img src="./img/defaultIfEmpty.png" width="100%">
 *
 * `defaultIfEmpty` emits the values emitted by the source Observable or a
 * specified default value if the source Observable is empty (completes without
 * having emitted any `next` value).
 *
 * @example <caption>If no clicks happen in 5 seconds, then emit "no clicks"</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var clicksBeforeFive = clicks.takeUntil(Rx.Observable.interval(5000));
 * var result = clicksBeforeFive.defaultIfEmpty('no clicks');
 * result.subscribe(x => console.log(x));
 *
 * @see {@link empty}
 * @see {@link last}
 *
 * @param {any} [defaultValue=null] The default value used if the source
 * Observable is empty.
 * @return {Observable} An Observable that emits either the specified
 * `defaultValue` if the source Observable emits no items, or the values emitted
 * by the source Observable.
 * @method defaultIfEmpty
 * @owner Observable
 */
function defaultIfEmpty(defaultValue) {
    if ( defaultValue === void 0 ) defaultValue = null;

    return this.lift(new DefaultIfEmptyOperator(defaultValue));
}
var DefaultIfEmptyOperator = function DefaultIfEmptyOperator(defaultValue) {
    this.defaultValue = defaultValue;
};
DefaultIfEmptyOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new DefaultIfEmptySubscriber(subscriber, this.defaultValue));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var DefaultIfEmptySubscriber = (function (Subscriber$$1) {
    function DefaultIfEmptySubscriber(destination, defaultValue) {
        Subscriber$$1.call(this, destination);
        this.defaultValue = defaultValue;
        this.isEmpty = true;
    }

    if ( Subscriber$$1 ) DefaultIfEmptySubscriber.__proto__ = Subscriber$$1;
    DefaultIfEmptySubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    DefaultIfEmptySubscriber.prototype.constructor = DefaultIfEmptySubscriber;
    DefaultIfEmptySubscriber.prototype._next = function _next (value) {
        this.isEmpty = false;
        this.destination.next(value);
    };
    DefaultIfEmptySubscriber.prototype._complete = function _complete () {
        if (this.isEmpty) {
            this.destination.next(this.defaultValue);
        }
        this.destination.complete();
    };

    return DefaultIfEmptySubscriber;
}(Subscriber));

Observable.prototype.defaultIfEmpty = defaultIfEmpty;

/**
 * Delays the emission of items from the source Observable by a given timeout or
 * until a given Date.
 *
 * <span class="informal">Time shifts each item by some specified amount of
 * milliseconds.</span>
 *
 * <img src="./img/delay.png" width="100%">
 *
 * If the delay argument is a Number, this operator time shifts the source
 * Observable by that amount of time expressed in milliseconds. The relative
 * time intervals between the values are preserved.
 *
 * If the delay argument is a Date, this operator time shifts the start of the
 * Observable execution until the given date occurs.
 *
 * @example <caption>Delay each click by one second</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var delayedClicks = clicks.delay(1000); // each click emitted after 1 second
 * delayedClicks.subscribe(x => console.log(x));
 *
 * @example <caption>Delay all clicks until a future date happens</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var date = new Date('March 15, 2050 12:00:00'); // in the future
 * var delayedClicks = clicks.delay(date); // click emitted only after that date
 * delayedClicks.subscribe(x => console.log(x));
 *
 * @see {@link debounceTime}
 * @see {@link delayWhen}
 *
 * @param {number|Date} delay The delay duration in milliseconds (a `number`) or
 * a `Date` until which the emission of the source items is delayed.
 * @param {Scheduler} [scheduler=async] The Scheduler to use for
 * managing the timers that handle the time-shift for each item.
 * @return {Observable} An Observable that delays the emissions of the source
 * Observable by the specified timeout or Date.
 * @method delay
 * @owner Observable
 */
function delay(delay, scheduler) {
    if ( scheduler === void 0 ) scheduler = async;

    var absoluteDelay = isDate(delay);
    var delayFor = absoluteDelay ? (+delay - scheduler.now()) : Math.abs(delay);
    return this.lift(new DelayOperator(delayFor, scheduler));
}
var DelayOperator = function DelayOperator(delay, scheduler) {
    this.delay = delay;
    this.scheduler = scheduler;
};
DelayOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new DelaySubscriber(subscriber, this.delay, this.scheduler));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var DelaySubscriber = (function (Subscriber$$1) {
    function DelaySubscriber(destination, delay, scheduler) {
        Subscriber$$1.call(this, destination);
        this.delay = delay;
        this.scheduler = scheduler;
        this.queue = [];
        this.active = false;
        this.errored = false;
    }

    if ( Subscriber$$1 ) DelaySubscriber.__proto__ = Subscriber$$1;
    DelaySubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    DelaySubscriber.prototype.constructor = DelaySubscriber;
    DelaySubscriber.dispatch = function dispatch (state) {
        var source = state.source;
        var queue = source.queue;
        var scheduler = state.scheduler;
        var destination = state.destination;
        while (queue.length > 0 && (queue[0].time - scheduler.now()) <= 0) {
            queue.shift().notification.observe(destination);
        }
        if (queue.length > 0) {
            var delay = Math.max(0, queue[0].time - scheduler.now());
            this.schedule(state, delay);
        }
        else {
            source.active = false;
        }
    };
    DelaySubscriber.prototype._schedule = function _schedule (scheduler) {
        this.active = true;
        this.add(scheduler.schedule(DelaySubscriber.dispatch, this.delay, {
            source: this, destination: this.destination, scheduler: scheduler
        }));
    };
    DelaySubscriber.prototype.scheduleNotification = function scheduleNotification (notification) {
        if (this.errored === true) {
            return;
        }
        var scheduler = this.scheduler;
        var message = new DelayMessage(scheduler.now() + this.delay, notification);
        this.queue.push(message);
        if (this.active === false) {
            this._schedule(scheduler);
        }
    };
    DelaySubscriber.prototype._next = function _next (value) {
        this.scheduleNotification(Notification.createNext(value));
    };
    DelaySubscriber.prototype._error = function _error (err) {
        this.errored = true;
        this.queue = [];
        this.destination.error(err);
    };
    DelaySubscriber.prototype._complete = function _complete () {
        this.scheduleNotification(Notification.createComplete());
    };

    return DelaySubscriber;
}(Subscriber));
var DelayMessage = function DelayMessage(time, notification) {
    this.time = time;
    this.notification = notification;
};

Observable.prototype.delay = delay;

/**
 * Delays the emission of items from the source Observable by a given time span
 * determined by the emissions of another Observable.
 *
 * <span class="informal">It's like {@link delay}, but the time span of the
 * delay duration is determined by a second Observable.</span>
 *
 * <img src="./img/delayWhen.png" width="100%">
 *
 * `delayWhen` time shifts each emitted value from the source Observable by a
 * time span determined by another Observable. When the source emits a value,
 * the `delayDurationSelector` function is called with the source value as
 * argument, and should return an Observable, called the "duration" Observable.
 * The source value is emitted on the output Observable only when the duration
 * Observable emits a value or completes.
 *
 * Optionally, `delayWhen` takes a second argument, `subscriptionDelay`, which
 * is an Observable. When `subscriptionDelay` emits its first value or
 * completes, the source Observable is subscribed to and starts behaving like
 * described in the previous paragraph. If `subscriptionDelay` is not provided,
 * `delayWhen` will subscribe to the source Observable as soon as the output
 * Observable is subscribed.
 *
 * @example <caption>Delay each click by a random amount of time, between 0 and 5 seconds</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var delayedClicks = clicks.delayWhen(event =>
 *   Rx.Observable.interval(Math.random() * 5000)
 * );
 * delayedClicks.subscribe(x => console.log(x));
 *
 * @see {@link debounce}
 * @see {@link delay}
 *
 * @param {function(value: T): Observable} delayDurationSelector A function that
 * returns an Observable for each value emitted by the source Observable, which
 * is then used to delay the emission of that item on the output Observable
 * until the Observable returned from this function emits a value.
 * @param {Observable} subscriptionDelay An Observable that triggers the
 * subscription to the source Observable once it emits any value.
 * @return {Observable} An Observable that delays the emissions of the source
 * Observable by an amount of time specified by the Observable returned by
 * `delayDurationSelector`.
 * @method delayWhen
 * @owner Observable
 */
function delayWhen(delayDurationSelector, subscriptionDelay) {
    if (subscriptionDelay) {
        return new SubscriptionDelayObservable(this, subscriptionDelay)
            .lift(new DelayWhenOperator(delayDurationSelector));
    }
    return this.lift(new DelayWhenOperator(delayDurationSelector));
}
var DelayWhenOperator = function DelayWhenOperator(delayDurationSelector) {
    this.delayDurationSelector = delayDurationSelector;
};
DelayWhenOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new DelayWhenSubscriber(subscriber, this.delayDurationSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var DelayWhenSubscriber = (function (OuterSubscriber$$1) {
    function DelayWhenSubscriber(destination, delayDurationSelector) {
        OuterSubscriber$$1.call(this, destination);
        this.delayDurationSelector = delayDurationSelector;
        this.completed = false;
        this.delayNotifierSubscriptions = [];
        this.values = [];
    }

    if ( OuterSubscriber$$1 ) DelayWhenSubscriber.__proto__ = OuterSubscriber$$1;
    DelayWhenSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    DelayWhenSubscriber.prototype.constructor = DelayWhenSubscriber;
    DelayWhenSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.destination.next(outerValue);
        this.removeSubscription(innerSub);
        this.tryComplete();
    };
    DelayWhenSubscriber.prototype.notifyError = function notifyError (error, innerSub) {
        this._error(error);
    };
    DelayWhenSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        var value = this.removeSubscription(innerSub);
        if (value) {
            this.destination.next(value);
        }
        this.tryComplete();
    };
    DelayWhenSubscriber.prototype._next = function _next (value) {
        try {
            var delayNotifier = this.delayDurationSelector(value);
            if (delayNotifier) {
                this.tryDelay(delayNotifier, value);
            }
        }
        catch (err) {
            this.destination.error(err);
        }
    };
    DelayWhenSubscriber.prototype._complete = function _complete () {
        this.completed = true;
        this.tryComplete();
    };
    DelayWhenSubscriber.prototype.removeSubscription = function removeSubscription (subscription) {
        subscription.unsubscribe();
        var subscriptionIdx = this.delayNotifierSubscriptions.indexOf(subscription);
        var value = null;
        if (subscriptionIdx !== -1) {
            value = this.values[subscriptionIdx];
            this.delayNotifierSubscriptions.splice(subscriptionIdx, 1);
            this.values.splice(subscriptionIdx, 1);
        }
        return value;
    };
    DelayWhenSubscriber.prototype.tryDelay = function tryDelay (delayNotifier, value) {
        var notifierSubscription = subscribeToResult(this, delayNotifier, value);
        this.add(notifierSubscription);
        this.delayNotifierSubscriptions.push(notifierSubscription);
        this.values.push(value);
    };
    DelayWhenSubscriber.prototype.tryComplete = function tryComplete () {
        if (this.completed && this.delayNotifierSubscriptions.length === 0) {
            this.destination.complete();
        }
    };

    return DelayWhenSubscriber;
}(OuterSubscriber));
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SubscriptionDelayObservable = (function (Observable$$1) {
    function SubscriptionDelayObservable(source, subscriptionDelay) {
        Observable$$1.call(this);
        this.source = source;
        this.subscriptionDelay = subscriptionDelay;
    }

    if ( Observable$$1 ) SubscriptionDelayObservable.__proto__ = Observable$$1;
    SubscriptionDelayObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    SubscriptionDelayObservable.prototype.constructor = SubscriptionDelayObservable;
    SubscriptionDelayObservable.prototype._subscribe = function _subscribe (subscriber) {
        this.subscriptionDelay.subscribe(new SubscriptionDelaySubscriber(subscriber, this.source));
    };

    return SubscriptionDelayObservable;
}(Observable));
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SubscriptionDelaySubscriber = (function (Subscriber$$1) {
    function SubscriptionDelaySubscriber(parent, source) {
        Subscriber$$1.call(this);
        this.parent = parent;
        this.source = source;
        this.sourceSubscribed = false;
    }

    if ( Subscriber$$1 ) SubscriptionDelaySubscriber.__proto__ = Subscriber$$1;
    SubscriptionDelaySubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    SubscriptionDelaySubscriber.prototype.constructor = SubscriptionDelaySubscriber;
    SubscriptionDelaySubscriber.prototype._next = function _next (unused) {
        this.subscribeToSource();
    };
    SubscriptionDelaySubscriber.prototype._error = function _error (err) {
        this.unsubscribe();
        this.parent.error(err);
    };
    SubscriptionDelaySubscriber.prototype._complete = function _complete () {
        this.subscribeToSource();
    };
    SubscriptionDelaySubscriber.prototype.subscribeToSource = function subscribeToSource () {
        if (!this.sourceSubscribed) {
            this.sourceSubscribed = true;
            this.unsubscribe();
            this.source.subscribe(this.parent);
        }
    };

    return SubscriptionDelaySubscriber;
}(Subscriber));

Observable.prototype.delayWhen = delayWhen;

/**
 * Returns an Observable that emits all items emitted by the source Observable that are distinct by comparison from previous items.
 * If a comparator function is provided, then it will be called for each item to test for whether or not that value should be emitted.
 * If a comparator function is not provided, an equality check is used by default.
 * As the internal HashSet of this operator grows larger and larger, care should be taken in the domain of inputs this operator may see.
 * An optional parameter is also provided such that an Observable can be provided to queue the internal HashSet to flush the values it holds.
 * @param {function} [compare] optional comparison function called to test if an item is distinct from previous items in the source.
 * @param {Observable} [flushes] optional Observable for flushing the internal HashSet of the operator.
 * @return {Observable} an Observable that emits items from the source Observable with distinct values.
 * @method distinct
 * @owner Observable
 */
function distinct(compare, flushes) {
    return this.lift(new DistinctOperator(compare, flushes));
}
var DistinctOperator = function DistinctOperator(compare, flushes) {
    this.compare = compare;
    this.flushes = flushes;
};
DistinctOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new DistinctSubscriber(subscriber, this.compare, this.flushes));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var DistinctSubscriber = (function (OuterSubscriber$$1) {
    function DistinctSubscriber(destination, compare, flushes) {
        OuterSubscriber$$1.call(this, destination);
        this.values = [];
        if (typeof compare === 'function') {
            this.compare = compare;
        }
        if (flushes) {
            this.add(subscribeToResult(this, flushes));
        }
    }

    if ( OuterSubscriber$$1 ) DistinctSubscriber.__proto__ = OuterSubscriber$$1;
    DistinctSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    DistinctSubscriber.prototype.constructor = DistinctSubscriber;
    DistinctSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.values.length = 0;
    };
    DistinctSubscriber.prototype.notifyError = function notifyError (error, innerSub) {
        this._error(error);
    };
    DistinctSubscriber.prototype._next = function _next (value) {
        var this$1 = this;

        var found = false;
        var values = this.values;
        var len = values.length;
        try {
            for (var i = 0; i < len; i++) {
                if (this$1.compare(values[i], value)) {
                    found = true;
                    return;
                }
            }
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.values.push(value);
        this.destination.next(value);
    };
    DistinctSubscriber.prototype.compare = function compare (x, y) {
        return x === y;
    };

    return DistinctSubscriber;
}(OuterSubscriber));

Observable.prototype.distinct = distinct;

/**
 * Returns an Observable that emits all items emitted by the source Observable that are distinct by comparison from previous items,
 * using a property accessed by using the key provided to check if the two items are distinct.
 * If a comparator function is provided, then it will be called for each item to test for whether or not that value should be emitted.
 * If a comparator function is not provided, an equality check is used by default.
 * As the internal HashSet of this operator grows larger and larger, care should be taken in the domain of inputs this operator may see.
 * An optional parameter is also provided such that an Observable can be provided to queue the internal HashSet to flush the values it holds.
 * @param {string} key string key for object property lookup on each item.
 * @param {function} [compare] optional comparison function called to test if an item is distinct from previous items in the source.
 * @param {Observable} [flushes] optional Observable for flushing the internal HashSet of the operator.
 * @return {Observable} an Observable that emits items from the source Observable with distinct values.
 * @method distinctKey
 * @owner Observable
 */
function distinctKey(key, compare, flushes) {
    return distinct.call(this, function (x, y) {
        if (compare) {
            return compare(x[key], y[key]);
        }
        return x[key] === y[key];
    }, flushes);
}

Observable.prototype.distinctKey = distinctKey;

/**
 * Returns an Observable that emits all items emitted by the source Observable that are distinct by comparison from the previous item.
 * If a comparator function is provided, then it will be called for each item to test for whether or not that value should be emitted.
 * If a comparator function is not provided, an equality check is used by default.
 * @param {function} [compare] optional comparison function called to test if an item is distinct from the previous item in the source.
 * @return {Observable} an Observable that emits items from the source Observable with distinct values.
 * @method distinctUntilChanged
 * @owner Observable
 */
function distinctUntilChanged(compare, keySelector) {
    return this.lift(new DistinctUntilChangedOperator(compare, keySelector));
}
var DistinctUntilChangedOperator = function DistinctUntilChangedOperator(compare, keySelector) {
    this.compare = compare;
    this.keySelector = keySelector;
};
DistinctUntilChangedOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new DistinctUntilChangedSubscriber(subscriber, this.compare, this.keySelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var DistinctUntilChangedSubscriber = (function (Subscriber$$1) {
    function DistinctUntilChangedSubscriber(destination, compare, keySelector) {
        Subscriber$$1.call(this, destination);
        this.keySelector = keySelector;
        this.hasKey = false;
        if (typeof compare === 'function') {
            this.compare = compare;
        }
    }

    if ( Subscriber$$1 ) DistinctUntilChangedSubscriber.__proto__ = Subscriber$$1;
    DistinctUntilChangedSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    DistinctUntilChangedSubscriber.prototype.constructor = DistinctUntilChangedSubscriber;
    DistinctUntilChangedSubscriber.prototype.compare = function compare (x, y) {
        return x === y;
    };
    DistinctUntilChangedSubscriber.prototype._next = function _next (value) {
        var keySelector = this.keySelector;
        var key = value;
        if (keySelector) {
            key = tryCatch(this.keySelector)(value);
            if (key === errorObject) {
                return this.destination.error(errorObject.e);
            }
        }
        var result = false;
        if (this.hasKey) {
            result = tryCatch(this.compare)(this.key, key);
            if (result === errorObject) {
                return this.destination.error(errorObject.e);
            }
        }
        else {
            this.hasKey = true;
        }
        if (Boolean(result) === false) {
            this.key = key;
            this.destination.next(value);
        }
    };

    return DistinctUntilChangedSubscriber;
}(Subscriber));

Observable.prototype.distinctUntilChanged = distinctUntilChanged;

/**
 * Returns an Observable that emits all items emitted by the source Observable that are distinct by comparison from the previous item,
 * using a property accessed by using the key provided to check if the two items are distinct.
 * If a comparator function is provided, then it will be called for each item to test for whether or not that value should be emitted.
 * If a comparator function is not provided, an equality check is used by default.
 * @param {string} key string key for object property lookup on each item.
 * @param {function} [compare] optional comparison function called to test if an item is distinct from the previous item in the source.
 * @return {Observable} an Observable that emits items from the source Observable with distinct values based on the key specified.
 * @method distinctUntilKeyChanged
 * @owner Observable
 */
function distinctUntilKeyChanged(key, compare) {
    return distinctUntilChanged.call(this, function (x, y) {
        if (compare) {
            return compare(x[key], y[key]);
        }
        return x[key] === y[key];
    });
}

Observable.prototype.distinctUntilKeyChanged = distinctUntilKeyChanged;

/**
 * Perform a side effect for every emission on the source Observable, but return
 * an Observable that is identical to the source.
 *
 * <span class="informal">Intercepts each emission on the source and runs a
 * function, but returns an output which is identical to the source.</span>
 *
 * <img src="./img/do.png" width="100%">
 *
 * Returns a mirrored Observable of the source Observable, but modified so that
 * the provided Observer is called to perform a side effect for every value,
 * error, and completion emitted by the source. Any errors that are thrown in
 * the aforementioned Observer or handlers are safely sent down the error path
 * of the output Observable.
 *
 * This operator is useful for debugging your Observables for the correct values
 * or performing other side effects.
 *
 * Note: this is different to a `subscribe` on the Observable. If the Observable
 * returned by `do` is not subscribed, the side effects specified by the
 * Observer will never happen. `do` therefore simply spies on existing
 * execution, it does not trigger an execution to happen like `subscribe` does.
 *
 * @example <caption>Map every every click to the clientX position of that click, while also logging the click event</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var positions = clicks
 *   .do(ev => console.log(ev))
 *   .map(ev => ev.clientX);
 * positions.subscribe(x => console.log(x));
 *
 * @see {@link map}
 * @see {@link subscribe}
 *
 * @param {Observer|function} [nextOrObserver] A normal Observer object or a
 * callback for `next`.
 * @param {function} [error] Callback for errors in the source.
 * @param {function} [complete] Callback for the completion of the source.
 * @return {Observable} An Observable identical to the source, but runs the
 * specified Observer or callback(s) for each item.
 * @method do
 * @name do
 * @owner Observable
 */
function _do(nextOrObserver, error, complete) {
    return this.lift(new DoOperator(nextOrObserver, error, complete));
}
var DoOperator = function DoOperator(nextOrObserver, error, complete) {
    this.nextOrObserver = nextOrObserver;
    this.error = error;
    this.complete = complete;
};
DoOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new DoSubscriber(subscriber, this.nextOrObserver, this.error, this.complete));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var DoSubscriber = (function (Subscriber$$1) {
    function DoSubscriber(destination, nextOrObserver, error, complete) {
        Subscriber$$1.call(this, destination);
        var safeSubscriber = new Subscriber$$1(nextOrObserver, error, complete);
        safeSubscriber.syncErrorThrowable = true;
        this.add(safeSubscriber);
        this.safeSubscriber = safeSubscriber;
    }

    if ( Subscriber$$1 ) DoSubscriber.__proto__ = Subscriber$$1;
    DoSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    DoSubscriber.prototype.constructor = DoSubscriber;
    DoSubscriber.prototype._next = function _next (value) {
        var ref = this;
        var safeSubscriber = ref.safeSubscriber;
        safeSubscriber.next(value);
        if (safeSubscriber.syncErrorThrown) {
            this.destination.error(safeSubscriber.syncErrorValue);
        }
        else {
            this.destination.next(value);
        }
    };
    DoSubscriber.prototype._error = function _error (err) {
        var ref = this;
        var safeSubscriber = ref.safeSubscriber;
        safeSubscriber.error(err);
        if (safeSubscriber.syncErrorThrown) {
            this.destination.error(safeSubscriber.syncErrorValue);
        }
        else {
            this.destination.error(err);
        }
    };
    DoSubscriber.prototype._complete = function _complete () {
        var ref = this;
        var safeSubscriber = ref.safeSubscriber;
        safeSubscriber.complete();
        if (safeSubscriber.syncErrorThrown) {
            this.destination.error(safeSubscriber.syncErrorValue);
        }
        else {
            this.destination.complete();
        }
    };

    return DoSubscriber;
}(Subscriber));

Observable.prototype.do = _do;
Observable.prototype._do = _do;

/**
 * Converts a higher-order Observable into a first-order Observable by dropping
 * inner Observables while the previous inner Observable has not yet completed.
 *
 * <span class="informal">Flattens an Observable-of-Observables by dropping the
 * next inner Observables while the current inner is still executing.</span>
 *
 * <img src="./img/exhaust.png" width="100%">
 *
 * `exhaust` subscribes to an Observable that emits Observables, also known as a
 * higher-order Observable. Each time it observes one of these emitted inner
 * Observables, the output Observable begins emitting the items emitted by that
 * inner Observable. So far, it behaves like {@link mergeAll}. However,
 * `exhaust` ignores every new inner Observable if the previous Observable has
 * not yet completed. Once that one completes, it will accept and flatten the
 * next inner Observable and repeat this process.
 *
 * @example <caption>Run a finite timer for each click, only if there is no currently active timer</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000));
 * var result = higherOrder.exhaust();
 * result.subscribe(x => console.log(x));
 *
 * @see {@link combineAll}
 * @see {@link concatAll}
 * @see {@link switch}
 * @see {@link mergeAll}
 * @see {@link exhaustMap}
 * @see {@link zipAll}
 *
 * @return {Observable} Returns an Observable that takes a source of Observables
 * and propagates the first observable exclusively until it completes before
 * subscribing to the next.
 * @method exhaust
 * @owner Observable
 */
function exhaust() {
    return this.lift(new SwitchFirstOperator());
}
var SwitchFirstOperator = function SwitchFirstOperator () {};

SwitchFirstOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SwitchFirstSubscriber(subscriber));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SwitchFirstSubscriber = (function (OuterSubscriber$$1) {
    function SwitchFirstSubscriber(destination) {
        OuterSubscriber$$1.call(this, destination);
        this.hasCompleted = false;
        this.hasSubscription = false;
    }

    if ( OuterSubscriber$$1 ) SwitchFirstSubscriber.__proto__ = OuterSubscriber$$1;
    SwitchFirstSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    SwitchFirstSubscriber.prototype.constructor = SwitchFirstSubscriber;
    SwitchFirstSubscriber.prototype._next = function _next (value) {
        if (!this.hasSubscription) {
            this.hasSubscription = true;
            this.add(subscribeToResult(this, value));
        }
    };
    SwitchFirstSubscriber.prototype._complete = function _complete () {
        this.hasCompleted = true;
        if (!this.hasSubscription) {
            this.destination.complete();
        }
    };
    SwitchFirstSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        this.remove(innerSub);
        this.hasSubscription = false;
        if (this.hasCompleted) {
            this.destination.complete();
        }
    };

    return SwitchFirstSubscriber;
}(OuterSubscriber));

Observable.prototype.exhaust = exhaust;

/**
 * Projects each source value to an Observable which is merged in the output
 * Observable only if the previous projected Observable has completed.
 *
 * <span class="informal">Maps each value to an Observable, then flattens all of
 * these inner Observables using {@link exhaust}.</span>
 *
 * <img src="./img/exhaustMap.png" width="100%">
 *
 * Returns an Observable that emits items based on applying a function that you
 * supply to each item emitted by the source Observable, where that function
 * returns an (so-called "inner") Observable. When it projects a source value to
 * an Observable, the output Observable begins emitting the items emitted by
 * that projected Observable. However, `exhaustMap` ignores every new projected
 * Observable if the previous projected Observable has not yet completed. Once
 * that one completes, it will accept and flatten the next projected Observable
 * and repeat this process.
 *
 * @example <caption>Run a finite timer for each click, only if there is no currently active timer</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.exhaustMap((ev) => Rx.Observable.interval(1000));
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concatMap}
 * @see {@link exhaust}
 * @see {@link mergeMap}
 * @see {@link switchMap}
 *
 * @param {function(value: T, ?index: number): Observable} project A function
 * that, when applied to an item emitted by the source Observable, returns an
 * Observable.
 * @param {function(outerValue: T, innerValue: I, outerIndex: number, innerIndex: number): any} [resultSelector]
 * A function to produce the value on the output Observable based on the values
 * and the indices of the source (outer) emission and the inner Observable
 * emission. The arguments passed to this function are:
 * - `outerValue`: the value that came from the source
 * - `innerValue`: the value that came from the projected Observable
 * - `outerIndex`: the "index" of the value that came from the source
 * - `innerIndex`: the "index" of the value from the projected Observable
 * @return {Observable} An Observable containing projected Observables
 * of each item of the source, ignoring projected Observables that start before
 * their preceding Observable has completed.
 * @method exhaustMap
 * @owner Observable
 */
function exhaustMap(project, resultSelector) {
    return this.lift(new SwitchFirstMapOperator(project, resultSelector));
}
var SwitchFirstMapOperator = function SwitchFirstMapOperator(project, resultSelector) {
    this.project = project;
    this.resultSelector = resultSelector;
};
SwitchFirstMapOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SwitchFirstMapSubscriber(subscriber, this.project, this.resultSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SwitchFirstMapSubscriber = (function (OuterSubscriber$$1) {
    function SwitchFirstMapSubscriber(destination, project, resultSelector) {
        OuterSubscriber$$1.call(this, destination);
        this.project = project;
        this.resultSelector = resultSelector;
        this.hasSubscription = false;
        this.hasCompleted = false;
        this.index = 0;
    }

    if ( OuterSubscriber$$1 ) SwitchFirstMapSubscriber.__proto__ = OuterSubscriber$$1;
    SwitchFirstMapSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    SwitchFirstMapSubscriber.prototype.constructor = SwitchFirstMapSubscriber;
    SwitchFirstMapSubscriber.prototype._next = function _next (value) {
        if (!this.hasSubscription) {
            this.tryNext(value);
        }
    };
    SwitchFirstMapSubscriber.prototype.tryNext = function tryNext (value) {
        var index = this.index++;
        var destination = this.destination;
        try {
            var result = this.project(value, index);
            this.hasSubscription = true;
            this.add(subscribeToResult(this, result, value, index));
        }
        catch (err) {
            destination.error(err);
        }
    };
    SwitchFirstMapSubscriber.prototype._complete = function _complete () {
        this.hasCompleted = true;
        if (!this.hasSubscription) {
            this.destination.complete();
        }
    };
    SwitchFirstMapSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        var ref = this;
        var resultSelector = ref.resultSelector;
        var destination = ref.destination;
        if (resultSelector) {
            this.trySelectResult(outerValue, innerValue, outerIndex, innerIndex);
        }
        else {
            destination.next(innerValue);
        }
    };
    SwitchFirstMapSubscriber.prototype.trySelectResult = function trySelectResult (outerValue, innerValue, outerIndex, innerIndex) {
        var ref = this;
        var resultSelector = ref.resultSelector;
        var destination = ref.destination;
        try {
            var result = resultSelector(outerValue, innerValue, outerIndex, innerIndex);
            destination.next(result);
        }
        catch (err) {
            destination.error(err);
        }
    };
    SwitchFirstMapSubscriber.prototype.notifyError = function notifyError (err) {
        this.destination.error(err);
    };
    SwitchFirstMapSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        this.remove(innerSub);
        this.hasSubscription = false;
        if (this.hasCompleted) {
            this.destination.complete();
        }
    };

    return SwitchFirstMapSubscriber;
}(OuterSubscriber));

Observable.prototype.exhaustMap = exhaustMap;

/**
 * Recursively projects each source value to an Observable which is merged in
 * the output Observable.
 *
 * <span class="informal">It's similar to {@link mergeMap}, but applies the
 * projection function to every source value as well as every output value.
 * It's recursive.</span>
 *
 * <img src="./img/expand.png" width="100%">
 *
 * Returns an Observable that emits items based on applying a function that you
 * supply to each item emitted by the source Observable, where that function
 * returns an Observable, and then merging those resulting Observables and
 * emitting the results of this merger. *Expand* will re-emit on the output
 * Observable every source value. Then, each output value is given to the
 * `project` function which returns an inner Observable to be merged on the
 * output Observable. Those output values resulting from the projection are also
 * given to the `project` function to produce new output values. This is how
 * *expand* behaves recursively.
 *
 * @example <caption>Start emitting the powers of two on every click, at most 10 of them</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var powersOfTwo = clicks
 *   .mapTo(1)
 *   .expand(x => Rx.Observable.of(2 * x).delay(1000))
 *   .take(10);
 * powersOfTwo.subscribe(x => console.log(x));
 *
 * @see {@link mergeMap}
 * @see {@link mergeScan}
 *
 * @param {function(value: T, index: number) => Observable} project A function
 * that, when applied to an item emitted by the source or the output Observable,
 * returns an Observable.
 * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of input
 * Observables being subscribed to concurrently.
 * @param {Scheduler} [scheduler=null] The Scheduler to use for subscribing to
 * each projected inner Observable.
 * @return {Observable} An Observable that emits the source values and also
 * result of applying the projection function to each value emitted on the
 * output Observable and and merging the results of the Observables obtained
 * from this transformation.
 * @method expand
 * @owner Observable
 */
function expand(project, concurrent, scheduler) {
    if ( concurrent === void 0 ) concurrent = Number.POSITIVE_INFINITY;
    if ( scheduler === void 0 ) scheduler = undefined;

    concurrent = (concurrent || 0) < 1 ? Number.POSITIVE_INFINITY : concurrent;
    return this.lift(new ExpandOperator(project, concurrent, scheduler));
}
var ExpandOperator = function ExpandOperator(project, concurrent, scheduler) {
    this.project = project;
    this.concurrent = concurrent;
    this.scheduler = scheduler;
};
ExpandOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new ExpandSubscriber(subscriber, this.project, this.concurrent, this.scheduler));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ExpandSubscriber = (function (OuterSubscriber$$1) {
    function ExpandSubscriber(destination, project, concurrent, scheduler) {
        OuterSubscriber$$1.call(this, destination);
        this.project = project;
        this.concurrent = concurrent;
        this.scheduler = scheduler;
        this.index = 0;
        this.active = 0;
        this.hasCompleted = false;
        if (concurrent < Number.POSITIVE_INFINITY) {
            this.buffer = [];
        }
    }

    if ( OuterSubscriber$$1 ) ExpandSubscriber.__proto__ = OuterSubscriber$$1;
    ExpandSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    ExpandSubscriber.prototype.constructor = ExpandSubscriber;
    ExpandSubscriber.dispatch = function dispatch (arg) {
        var subscriber = arg.subscriber;
        var result = arg.result;
        var value = arg.value;
        var index = arg.index;
        subscriber.subscribeToProjection(result, value, index);
    };
    ExpandSubscriber.prototype._next = function _next (value) {
        var destination = this.destination;
        if (destination.closed) {
            this._complete();
            return;
        }
        var index = this.index++;
        if (this.active < this.concurrent) {
            destination.next(value);
            var result = tryCatch(this.project)(value, index);
            if (result === errorObject) {
                destination.error(errorObject.e);
            }
            else if (!this.scheduler) {
                this.subscribeToProjection(result, value, index);
            }
            else {
                var state = { subscriber: this, result: result, value: value, index: index };
                this.add(this.scheduler.schedule(ExpandSubscriber.dispatch, 0, state));
            }
        }
        else {
            this.buffer.push(value);
        }
    };
    ExpandSubscriber.prototype.subscribeToProjection = function subscribeToProjection (result, value, index) {
        this.active++;
        this.add(subscribeToResult(this, result, value, index));
    };
    ExpandSubscriber.prototype._complete = function _complete () {
        this.hasCompleted = true;
        if (this.hasCompleted && this.active === 0) {
            this.destination.complete();
        }
    };
    ExpandSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this._next(innerValue);
    };
    ExpandSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        var buffer = this.buffer;
        this.remove(innerSub);
        this.active--;
        if (buffer && buffer.length > 0) {
            this._next(buffer.shift());
        }
        if (this.hasCompleted && this.active === 0) {
            this.destination.complete();
        }
    };

    return ExpandSubscriber;
}(OuterSubscriber));

Observable.prototype.expand = expand;

/**
 * An error thrown when an element was queried at a certain index of an
 * Observable, but no such index or position exists in that sequence.
 *
 * @see {@link elementAt}
 * @see {@link take}
 * @see {@link takeLast}
 *
 * @class ArgumentOutOfRangeError
 */
var ArgumentOutOfRangeError = (function (Error) {
    function ArgumentOutOfRangeError() {
        var err = Error.call(this, 'argument out of range');
        this.name = err.name = 'ArgumentOutOfRangeError';
        this.stack = err.stack;
        this.message = err.message;
    }

    if ( Error ) ArgumentOutOfRangeError.__proto__ = Error;
    ArgumentOutOfRangeError.prototype = Object.create( Error && Error.prototype );
    ArgumentOutOfRangeError.prototype.constructor = ArgumentOutOfRangeError;

    return ArgumentOutOfRangeError;
}(Error));

/**
 * Emits the single value at the specified `index` in a sequence of emissions
 * from the source Observable.
 *
 * <span class="informal">Emits only the i-th value, then completes.</span>
 *
 * <img src="./img/elementAt.png" width="100%">
 *
 * `elementAt` returns an Observable that emits the item at the specified
 * `index` in the source Observable, or a default value if that `index` is out
 * of range and the `default` argument is provided. If the `default` argument is
 * not given and the `index` is out of range, the output Observable will emit an
 * `ArgumentOutOfRangeError` error.
 *
 * @example <caption>Emit only the third click event</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.elementAt(2);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link first}
 * @see {@link last}
 * @see {@link skip}
 * @see {@link single}
 * @see {@link take}
 *
 * @throws {ArgumentOutOfRangeError} When using `elementAt(i)`, it delivers an
 * ArgumentOutOrRangeError to the Observer's `error` callback if `i < 0` or the
 * Observable has completed before emitting the i-th `next` notification.
 *
 * @param {number} index Is the number `i` for the i-th source emission that has
 * happened since the subscription, starting from the number `0`.
 * @param {T} [defaultValue] The default value returned for missing indices.
 * @return {Observable} An Observable that emits a single item, if it is found.
 * Otherwise, will emit the default value if given. If not, then emits an error.
 * @method elementAt
 * @owner Observable
 */
function elementAt(index, defaultValue) {
    return this.lift(new ElementAtOperator(index, defaultValue));
}
var ElementAtOperator = function ElementAtOperator(index, defaultValue) {
    this.index = index;
    this.defaultValue = defaultValue;
    if (index < 0) {
        throw new ArgumentOutOfRangeError;
    }
};
ElementAtOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new ElementAtSubscriber(subscriber, this.index, this.defaultValue));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ElementAtSubscriber = (function (Subscriber$$1) {
    function ElementAtSubscriber(destination, index, defaultValue) {
        Subscriber$$1.call(this, destination);
        this.index = index;
        this.defaultValue = defaultValue;
    }

    if ( Subscriber$$1 ) ElementAtSubscriber.__proto__ = Subscriber$$1;
    ElementAtSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    ElementAtSubscriber.prototype.constructor = ElementAtSubscriber;
    ElementAtSubscriber.prototype._next = function _next (x) {
        if (this.index-- === 0) {
            this.destination.next(x);
            this.destination.complete();
        }
    };
    ElementAtSubscriber.prototype._complete = function _complete () {
        var destination = this.destination;
        if (this.index >= 0) {
            if (typeof this.defaultValue !== 'undefined') {
                destination.next(this.defaultValue);
            }
            else {
                destination.error(new ArgumentOutOfRangeError);
            }
        }
        destination.complete();
    };

    return ElementAtSubscriber;
}(Subscriber));

Observable.prototype.elementAt = elementAt;

/**
 * Filter items emitted by the source Observable by only emitting those that
 * satisfy a specified predicate.
 *
 * <span class="informal">Like
 * [Array.prototype.filter()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter),
 * it only emits a value from the source if it passes a criterion function.</span>
 *
 * <img src="./img/filter.png" width="100%">
 *
 * Similar to the well-known `Array.prototype.filter` method, this operator
 * takes values from the source Observable, passes them through a `predicate`
 * function and only emits those values that yielded `true`.
 *
 * @example <caption>Emit only click events whose target was a DIV element</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var clicksOnDivs = clicks.filter(ev => ev.target.tagName === 'DIV');
 * clicksOnDivs.subscribe(x => console.log(x));
 *
 * @see {@link distinct}
 * @see {@link distinctKey}
 * @see {@link distinctUntilChanged}
 * @see {@link distinctUntilKeyChanged}
 * @see {@link ignoreElements}
 * @see {@link partition}
 * @see {@link skip}
 *
 * @param {function(value: T, index: number): boolean} predicate A function that
 * evaluates each value emitted by the source Observable. If it returns `true`,
 * the value is emitted, if `false` the value is not passed to the output
 * Observable. The `index` parameter is the number `i` for the i-th source
 * emission that has happened since the subscription, starting from the number
 * `0`.
 * @param {any} [thisArg] An optional argument to determine the value of `this`
 * in the `predicate` function.
 * @return {Observable} An Observable of values from the source that were
 * allowed by the `predicate` function.
 * @method filter
 * @owner Observable
 */
function filter(predicate, thisArg) {
    return this.lift(new FilterOperator(predicate, thisArg));
}
var FilterOperator = function FilterOperator(predicate, thisArg) {
    this.predicate = predicate;
    this.thisArg = thisArg;
};
FilterOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new FilterSubscriber(subscriber, this.predicate, this.thisArg));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var FilterSubscriber = (function (Subscriber$$1) {
    function FilterSubscriber(destination, predicate, thisArg) {
        Subscriber$$1.call(this, destination);
        this.predicate = predicate;
        this.thisArg = thisArg;
        this.count = 0;
        this.predicate = predicate;
    }

    if ( Subscriber$$1 ) FilterSubscriber.__proto__ = Subscriber$$1;
    FilterSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    FilterSubscriber.prototype.constructor = FilterSubscriber;
    // the try catch block below is left specifically for
    // optimization and perf reasons. a tryCatcher is not necessary here.
    FilterSubscriber.prototype._next = function _next (value) {
        var result;
        try {
            result = this.predicate.call(this.thisArg, value, this.count++);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        if (result) {
            this.destination.next(value);
        }
    };

    return FilterSubscriber;
}(Subscriber));

Observable.prototype.filter = filter;

/**
 * Returns an Observable that mirrors the source Observable, but will call a specified function when
 * the source terminates on complete or error.
 * @param {function} callback function to be called when source terminates.
 * @return {Observable} an Observable that mirrors the source, but will call the specified function on termination.
 * @method finally
 * @owner Observable
 */
function _finally(callback) {
    return this.lift(new FinallyOperator(callback));
}
var FinallyOperator = function FinallyOperator(callback) {
    this.callback = callback;
};
FinallyOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new FinallySubscriber(subscriber, this.callback));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var FinallySubscriber = (function (Subscriber$$1) {
    function FinallySubscriber(destination, callback) {
        Subscriber$$1.call(this, destination);
        this.add(new Subscription(callback));
    }

    if ( Subscriber$$1 ) FinallySubscriber.__proto__ = Subscriber$$1;
    FinallySubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    FinallySubscriber.prototype.constructor = FinallySubscriber;

    return FinallySubscriber;
}(Subscriber));

Observable.prototype.finally = _finally;
Observable.prototype._finally = _finally;

/**
 * Emits only the first value emitted by the source Observable that meets some
 * condition.
 *
 * <span class="informal">Finds the first value that passes some test and emits
 * that.</span>
 *
 * <img src="./img/find.png" width="100%">
 *
 * `find` searches for the first item in the source Observable that matches the
 * specified condition embodied by the `predicate`, and returns the first
 * occurrence in the source. Unlike {@link first}, the `predicate` is required
 * in `find`, and does not emit an error if a valid value is not found.
 *
 * @example <caption>Find and emit the first click that happens on a DIV element</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.find(ev => ev.target.tagName === 'DIV');
 * result.subscribe(x => console.log(x));
 *
 * @see {@link filter}
 * @see {@link first}
 * @see {@link findIndex}
 * @see {@link take}
 *
 * @param {function(value: T, index: number, source: Observable<T>): boolean} predicate
 * A function called with each item to test for condition matching.
 * @param {any} [thisArg] An optional argument to determine the value of `this`
 * in the `predicate` function.
 * @return {Observable<T>} An Observable of the first item that matches the
 * condition.
 * @method find
 * @owner Observable
 */
function find(predicate, thisArg) {
    if (typeof predicate !== 'function') {
        throw new TypeError('predicate is not a function');
    }
    return this.lift(new FindValueOperator(predicate, this, false, thisArg));
}
var FindValueOperator = function FindValueOperator(predicate, source, yieldIndex, thisArg) {
    this.predicate = predicate;
    this.source = source;
    this.yieldIndex = yieldIndex;
    this.thisArg = thisArg;
};
FindValueOperator.prototype.call = function call (observer, source) {
    return source._subscribe(new FindValueSubscriber(observer, this.predicate, this.source, this.yieldIndex, this.thisArg));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var FindValueSubscriber = (function (Subscriber$$1) {
    function FindValueSubscriber(destination, predicate, source, yieldIndex, thisArg) {
        Subscriber$$1.call(this, destination);
        this.predicate = predicate;
        this.source = source;
        this.yieldIndex = yieldIndex;
        this.thisArg = thisArg;
        this.index = 0;
    }

    if ( Subscriber$$1 ) FindValueSubscriber.__proto__ = Subscriber$$1;
    FindValueSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    FindValueSubscriber.prototype.constructor = FindValueSubscriber;
    FindValueSubscriber.prototype.notifyComplete = function notifyComplete (value) {
        var destination = this.destination;
        destination.next(value);
        destination.complete();
    };
    FindValueSubscriber.prototype._next = function _next (value) {
        var ref = this;
        var predicate = ref.predicate;
        var thisArg = ref.thisArg;
        var index = this.index++;
        try {
            var result = predicate.call(thisArg || this, value, index, this.source);
            if (result) {
                this.notifyComplete(this.yieldIndex ? index : value);
            }
        }
        catch (err) {
            this.destination.error(err);
        }
    };
    FindValueSubscriber.prototype._complete = function _complete () {
        this.notifyComplete(this.yieldIndex ? -1 : undefined);
    };

    return FindValueSubscriber;
}(Subscriber));

Observable.prototype.find = find;

/**
 * Emits only the index of the first value emitted by the source Observable that
 * meets some condition.
 *
 * <span class="informal">It's like {@link find}, but emits the index of the
 * found value, not the value itself.</span>
 *
 * <img src="./img/findIndex.png" width="100%">
 *
 * `findIndex` searches for the first item in the source Observable that matches
 * the specified condition embodied by the `predicate`, and returns the
 * (zero-based) index of the first occurrence in the source. Unlike
 * {@link first}, the `predicate` is required in `findIndex`, and does not emit
 * an error if a valid value is not found.
 *
 * @example <caption>Emit the index of first click that happens on a DIV element</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.findIndex(ev => ev.target.tagName === 'DIV');
 * result.subscribe(x => console.log(x));
 *
 * @see {@link filter}
 * @see {@link find}
 * @see {@link first}
 * @see {@link take}
 *
 * @param {function(value: T, index: number, source: Observable<T>): boolean} predicate
 * A function called with each item to test for condition matching.
 * @param {any} [thisArg] An optional argument to determine the value of `this`
 * in the `predicate` function.
 * @return {Observable} An Observable of the index of the first item that
 * matches the condition.
 * @method find
 * @owner Observable
 */
function findIndex(predicate, thisArg) {
    return this.lift(new FindValueOperator(predicate, this, true, thisArg));
}

Observable.prototype.findIndex = findIndex;

/**
 * An error thrown when an Observable or a sequence was queried but has no
 * elements.
 *
 * @see {@link first}
 * @see {@link last}
 * @see {@link single}
 *
 * @class EmptyError
 */
var EmptyError = (function (Error) {
    function EmptyError() {
        var err = Error.call(this, 'no elements in sequence');
        this.name = err.name = 'EmptyError';
        this.stack = err.stack;
        this.message = err.message;
    }

    if ( Error ) EmptyError.__proto__ = Error;
    EmptyError.prototype = Object.create( Error && Error.prototype );
    EmptyError.prototype.constructor = EmptyError;

    return EmptyError;
}(Error));

/**
 * Emits only the first value (or the first value that meets some condition)
 * emitted by the source Observable.
 *
 * <span class="informal">Emits only the first value. Or emits only the first
 * value that passes some test.</span>
 *
 * <img src="./img/first.png" width="100%">
 *
 * If called with no arguments, `first` emits the first value of the source
 * Observable, then completes. If called with a `predicate` function, `first`
 * emits the first value of the source that matches the specified condition. It
 * may also take a `resultSelector` function to produce the output value from
 * the input value, and a `defaultValue` to emit in case the source completes
 * before it is able to emit a valid value. Throws an error if `defaultValue`
 * was not provided and a matching element is not found.
 *
 * @example <caption>Emit only the first click that happens on the DOM</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.first();
 * result.subscribe(x => console.log(x));
 *
 * @example <caption>Emits the first click that happens on a DIV</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.first(ev => ev.target.tagName === 'DIV');
 * result.subscribe(x => console.log(x));
 *
 * @see {@link filter}
 * @see {@link find}
 * @see {@link take}
 *
 * @throws {EmptyError} Delivers an EmptyError to the Observer's `error`
 * callback if the Observable completes before any `next` notification was sent.
 *
 * @param {function(value: T, index: number, source: Observable<T>): boolean} [predicate]
 * An optional function called with each item to test for condition matching.
 * @param {function(value: T, index: number): R} [resultSelector] A function to
 * produce the value on the output Observable based on the values
 * and the indices of the source Observable. The arguments passed to this
 * function are:
 * - `value`: the value that was emitted on the source.
 * - `index`: the "index" of the value from the source.
 * @param {R} [defaultValue] The default value emitted in case no valid value
 * was found on the source.
 * @return {Observable<T|R>} an Observable of the first item that matches the
 * condition.
 * @method first
 * @owner Observable
 */
function first(predicate, resultSelector, defaultValue) {
    return this.lift(new FirstOperator(predicate, resultSelector, defaultValue, this));
}
var FirstOperator = function FirstOperator(predicate, resultSelector, defaultValue, source) {
    this.predicate = predicate;
    this.resultSelector = resultSelector;
    this.defaultValue = defaultValue;
    this.source = source;
};
FirstOperator.prototype.call = function call (observer, source) {
    return source._subscribe(new FirstSubscriber(observer, this.predicate, this.resultSelector, this.defaultValue, this.source));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var FirstSubscriber = (function (Subscriber$$1) {
    function FirstSubscriber(destination, predicate, resultSelector, defaultValue, source) {
        Subscriber$$1.call(this, destination);
        this.predicate = predicate;
        this.resultSelector = resultSelector;
        this.defaultValue = defaultValue;
        this.source = source;
        this.index = 0;
        this.hasCompleted = false;
    }

    if ( Subscriber$$1 ) FirstSubscriber.__proto__ = Subscriber$$1;
    FirstSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    FirstSubscriber.prototype.constructor = FirstSubscriber;
    FirstSubscriber.prototype._next = function _next (value) {
        var index = this.index++;
        if (this.predicate) {
            this._tryPredicate(value, index);
        }
        else {
            this._emit(value, index);
        }
    };
    FirstSubscriber.prototype._tryPredicate = function _tryPredicate (value, index) {
        var result;
        try {
            result = this.predicate(value, index, this.source);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        if (result) {
            this._emit(value, index);
        }
    };
    FirstSubscriber.prototype._emit = function _emit (value, index) {
        if (this.resultSelector) {
            this._tryResultSelector(value, index);
            return;
        }
        this._emitFinal(value);
    };
    FirstSubscriber.prototype._tryResultSelector = function _tryResultSelector (value, index) {
        var result;
        try {
            result = this.resultSelector(value, index);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this._emitFinal(result);
    };
    FirstSubscriber.prototype._emitFinal = function _emitFinal (value) {
        var destination = this.destination;
        destination.next(value);
        destination.complete();
        this.hasCompleted = true;
    };
    FirstSubscriber.prototype._complete = function _complete () {
        var destination = this.destination;
        if (!this.hasCompleted && typeof this.defaultValue !== 'undefined') {
            destination.next(this.defaultValue);
            destination.complete();
        }
        else if (!this.hasCompleted) {
            destination.error(new EmptyError);
        }
    };

    return FirstSubscriber;
}(Subscriber));

Observable.prototype.first = first;

var MapPolyfill = function MapPolyfill() {
    this.size = 0;
    this._values = [];
    this._keys = [];
};
MapPolyfill.prototype.get = function get (key) {
    var i = this._keys.indexOf(key);
    return i === -1 ? undefined : this._values[i];
};
MapPolyfill.prototype.set = function set (key, value) {
    var i = this._keys.indexOf(key);
    if (i === -1) {
        this._keys.push(key);
        this._values.push(value);
        this.size++;
    }
    else {
        this._values[i] = value;
    }
    return this;
};
MapPolyfill.prototype.delete = function delete$1 (key) {
    var i = this._keys.indexOf(key);
    if (i === -1) {
        return false;
    }
    this._values.splice(i, 1);
    this._keys.splice(i, 1);
    this.size--;
    return true;
};
MapPolyfill.prototype.clear = function clear () {
    this._keys.length = 0;
    this._values.length = 0;
    this.size = 0;
};
MapPolyfill.prototype.forEach = function forEach (cb, thisArg) {
        var this$1 = this;

    for (var i = 0; i < this.size; i++) {
        cb.call(thisArg, this$1._values[i], this$1._keys[i]);
    }
};

var Map = root.Map || (function () { return MapPolyfill; })();

var FastMap = function FastMap() {
    this.values = {};
};
FastMap.prototype.delete = function delete$1 (key) {
    this.values[key] = null;
    return true;
};
FastMap.prototype.set = function set (key, value) {
    this.values[key] = value;
    return this;
};
FastMap.prototype.get = function get (key) {
    return this.values[key];
};
FastMap.prototype.forEach = function forEach (cb, thisArg) {
    var values = this.values;
    for (var key in values) {
        if (values.hasOwnProperty(key) && values[key] !== null) {
            cb.call(thisArg, values[key], key);
        }
    }
};
FastMap.prototype.clear = function clear () {
    this.values = {};
};

/**
 * Groups the items emitted by an Observable according to a specified criterion,
 * and emits these grouped items as `GroupedObservables`, one
 * {@link GroupedObservable} per group.
 *
 * <img src="./img/groupBy.png" width="100%">
 *
 * @param {function(value: T): K} keySelector a function that extracts the key
 * for each item.
 * @param {function(value: T): R} [elementSelector] a function that extracts the
 * return element for each item.
 * @param {function(grouped: GroupedObservable<K,R>): Observable<any>} [durationSelector]
 * a function that returns an Observable to determine how long each group should
 * exist.
 * @return {Observable<GroupedObservable<K,R>>} an Observable that emits
 * GroupedObservables, each of which corresponds to a unique key value and each
 * of which emits those items from the source Observable that share that key
 * value.
 * @method groupBy
 * @owner Observable
 */
function groupBy(keySelector, elementSelector, durationSelector) {
    return this.lift(new GroupByOperator(this, keySelector, elementSelector, durationSelector));
}
var GroupByOperator = function GroupByOperator(source, keySelector, elementSelector, durationSelector) {
    this.source = source;
    this.keySelector = keySelector;
    this.elementSelector = elementSelector;
    this.durationSelector = durationSelector;
};
GroupByOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new GroupBySubscriber(subscriber, this.keySelector, this.elementSelector, this.durationSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var GroupBySubscriber = (function (Subscriber$$1) {
    function GroupBySubscriber(destination, keySelector, elementSelector, durationSelector) {
        Subscriber$$1.call(this, destination);
        this.keySelector = keySelector;
        this.elementSelector = elementSelector;
        this.durationSelector = durationSelector;
        this.groups = null;
        this.attemptedToUnsubscribe = false;
        this.count = 0;
    }

    if ( Subscriber$$1 ) GroupBySubscriber.__proto__ = Subscriber$$1;
    GroupBySubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    GroupBySubscriber.prototype.constructor = GroupBySubscriber;
    GroupBySubscriber.prototype._next = function _next (value) {
        var key;
        try {
            key = this.keySelector(value);
        }
        catch (err) {
            this.error(err);
            return;
        }
        this._group(value, key);
    };
    GroupBySubscriber.prototype._group = function _group (value, key) {
        var groups = this.groups;
        if (!groups) {
            groups = this.groups = typeof key === 'string' ? new FastMap() : new Map();
        }
        var group = groups.get(key);
        var element;
        if (this.elementSelector) {
            try {
                element = this.elementSelector(value);
            }
            catch (err) {
                this.error(err);
            }
        }
        else {
            element = value;
        }
        if (!group) {
            groups.set(key, group = new Subject());
            var groupedObservable = new GroupedObservable(key, group, this);
            this.destination.next(groupedObservable);
            if (this.durationSelector) {
                var duration;
                try {
                    duration = this.durationSelector(new GroupedObservable(key, group));
                }
                catch (err) {
                    this.error(err);
                    return;
                }
                this.add(duration.subscribe(new GroupDurationSubscriber(key, group, this)));
            }
        }
        if (!group.closed) {
            group.next(element);
        }
    };
    GroupBySubscriber.prototype._error = function _error (err) {
        var groups = this.groups;
        if (groups) {
            groups.forEach(function (group, key) {
                group.error(err);
            });
            groups.clear();
        }
        this.destination.error(err);
    };
    GroupBySubscriber.prototype._complete = function _complete () {
        var groups = this.groups;
        if (groups) {
            groups.forEach(function (group, key) {
                group.complete();
            });
            groups.clear();
        }
        this.destination.complete();
    };
    GroupBySubscriber.prototype.removeGroup = function removeGroup (key) {
        this.groups.delete(key);
    };
    GroupBySubscriber.prototype.unsubscribe = function unsubscribe () {
        if (!this.closed && !this.attemptedToUnsubscribe) {
            this.attemptedToUnsubscribe = true;
            if (this.count === 0) {
                Subscriber$$1.prototype.unsubscribe.call(this);
            }
        }
    };

    return GroupBySubscriber;
}(Subscriber));
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var GroupDurationSubscriber = (function (Subscriber$$1) {
    function GroupDurationSubscriber(key, group, parent) {
        Subscriber$$1.call(this);
        this.key = key;
        this.group = group;
        this.parent = parent;
    }

    if ( Subscriber$$1 ) GroupDurationSubscriber.__proto__ = Subscriber$$1;
    GroupDurationSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    GroupDurationSubscriber.prototype.constructor = GroupDurationSubscriber;
    GroupDurationSubscriber.prototype._next = function _next (value) {
        this._complete();
    };
    GroupDurationSubscriber.prototype._error = function _error (err) {
        var group = this.group;
        if (!group.closed) {
            group.error(err);
        }
        this.parent.removeGroup(this.key);
    };
    GroupDurationSubscriber.prototype._complete = function _complete () {
        var group = this.group;
        if (!group.closed) {
            group.complete();
        }
        this.parent.removeGroup(this.key);
    };

    return GroupDurationSubscriber;
}(Subscriber));
/**
 * An Observable representing values belonging to the same group represented by
 * a common key. The values emitted by a GroupedObservable come from the source
 * Observable. The common key is available as the field `key` on a
 * GroupedObservable instance.
 *
 * @class GroupedObservable<K, T>
 */
var GroupedObservable = (function (Observable$$1) {
    function GroupedObservable(key, groupSubject, refCountSubscription) {
        Observable$$1.call(this);
        this.key = key;
        this.groupSubject = groupSubject;
        this.refCountSubscription = refCountSubscription;
    }

    if ( Observable$$1 ) GroupedObservable.__proto__ = Observable$$1;
    GroupedObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    GroupedObservable.prototype.constructor = GroupedObservable;
    GroupedObservable.prototype._subscribe = function _subscribe (subscriber) {
        var subscription = new Subscription();
        var ref = this;
        var refCountSubscription = ref.refCountSubscription;
        var groupSubject = ref.groupSubject;
        if (refCountSubscription && !refCountSubscription.closed) {
            subscription.add(new InnerRefCountSubscription(refCountSubscription));
        }
        subscription.add(groupSubject.subscribe(subscriber));
        return subscription;
    };

    return GroupedObservable;
}(Observable));
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var InnerRefCountSubscription = (function (Subscription$$1) {
    function InnerRefCountSubscription(parent) {
        Subscription$$1.call(this);
        this.parent = parent;
        parent.count++;
    }

    if ( Subscription$$1 ) InnerRefCountSubscription.__proto__ = Subscription$$1;
    InnerRefCountSubscription.prototype = Object.create( Subscription$$1 && Subscription$$1.prototype );
    InnerRefCountSubscription.prototype.constructor = InnerRefCountSubscription;
    InnerRefCountSubscription.prototype.unsubscribe = function unsubscribe () {
        var parent = this.parent;
        if (!parent.closed && !this.closed) {
            Subscription$$1.prototype.unsubscribe.call(this);
            parent.count -= 1;
            if (parent.count === 0 && parent.attemptedToUnsubscribe) {
                parent.unsubscribe();
            }
        }
    };

    return InnerRefCountSubscription;
}(Subscription));

Observable.prototype.groupBy = groupBy;

/**
 * Ignores all items emitted by the source Observable and only passes calls of `complete` or `error`.
 *
 * <img src="./img/ignoreElements.png" width="100%">
 *
 * @return {Observable} an empty Observable that only calls `complete`
 * or `error`, based on which one is called by the source Observable.
 * @method ignoreElements
 * @owner Observable
 */
function ignoreElements() {
    return this.lift(new IgnoreElementsOperator());
}

var IgnoreElementsOperator = function IgnoreElementsOperator () {};

IgnoreElementsOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new IgnoreElementsSubscriber(subscriber));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var IgnoreElementsSubscriber = (function (Subscriber$$1) {
    function IgnoreElementsSubscriber () {
        Subscriber$$1.apply(this, arguments);
    }

    if ( Subscriber$$1 ) IgnoreElementsSubscriber.__proto__ = Subscriber$$1;
    IgnoreElementsSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    IgnoreElementsSubscriber.prototype.constructor = IgnoreElementsSubscriber;

    IgnoreElementsSubscriber.prototype._next = function _next (unused) {
        noop();
    };

    return IgnoreElementsSubscriber;
}(Subscriber));

Observable.prototype.ignoreElements = ignoreElements;

/**
 * If the source Observable is empty it returns an Observable that emits true, otherwise it emits false.
 *
 * <img src="./img/isEmpty.png" width="100%">
 *
 * @return {Observable} an Observable that emits a Boolean.
 * @method isEmpty
 * @owner Observable
 */
function isEmpty() {
    return this.lift(new IsEmptyOperator());
}
var IsEmptyOperator = function IsEmptyOperator () {};

IsEmptyOperator.prototype.call = function call (observer, source) {
    return source._subscribe(new IsEmptySubscriber(observer));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var IsEmptySubscriber = (function (Subscriber$$1) {
    function IsEmptySubscriber(destination) {
        Subscriber$$1.call(this, destination);
    }

    if ( Subscriber$$1 ) IsEmptySubscriber.__proto__ = Subscriber$$1;
    IsEmptySubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    IsEmptySubscriber.prototype.constructor = IsEmptySubscriber;
    IsEmptySubscriber.prototype.notifyComplete = function notifyComplete (isEmpty) {
        var destination = this.destination;
        destination.next(isEmpty);
        destination.complete();
    };
    IsEmptySubscriber.prototype._next = function _next (value) {
        this.notifyComplete(false);
    };
    IsEmptySubscriber.prototype._complete = function _complete () {
        this.notifyComplete(true);
    };

    return IsEmptySubscriber;
}(Subscriber));

Observable.prototype.isEmpty = isEmpty;

/**
 * Ignores source values for a duration determined by another Observable, then
 * emits the most recent value from the source Observable, then repeats this
 * process.
 *
 * <span class="informal">It's like {@link auditTime}, but the silencing
 * duration is determined by a second Observable.</span>
 *
 * <img src="./img/audit.png" width="100%">
 *
 * `audit` is similar to `throttle`, but emits the last value from the silenced
 * time window, instead of the first value. `audit` emits the most recent value
 * from the source Observable on the output Observable as soon as its internal
 * timer becomes disabled, and ignores source values while the timer is enabled.
 * Initially, the timer is disabled. As soon as the first source value arrives,
 * the timer is enabled by calling the `durationSelector` function with the
 * source value, which returns the "duration" Observable. When the duration
 * Observable emits a value or completes, the timer is disabled, then the most
 * recent source value is emitted on the output Observable, and this process
 * repeats for the next source value.
 *
 * @example <caption>Emit clicks at a rate of at most one click per second</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.audit(ev => Rx.Observable.interval(1000));
 * result.subscribe(x => console.log(x));
 *
 * @see {@link auditTime}
 * @see {@link debounce}
 * @see {@link delayWhen}
 * @see {@link sample}
 * @see {@link throttle}
 *
 * @param {function(value: T): Observable|Promise} durationSelector A function
 * that receives a value from the source Observable, for computing the silencing
 * duration, returned as an Observable or a Promise.
 * @return {Observable<T>} An Observable that performs rate-limiting of
 * emissions from the source Observable.
 * @method audit
 * @owner Observable
 */
function audit(durationSelector) {
    return this.lift(new AuditOperator(durationSelector));
}
var AuditOperator = function AuditOperator(durationSelector) {
    this.durationSelector = durationSelector;
};
AuditOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new AuditSubscriber(subscriber, this.durationSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var AuditSubscriber = (function (OuterSubscriber$$1) {
    function AuditSubscriber(destination, durationSelector) {
        OuterSubscriber$$1.call(this, destination);
        this.durationSelector = durationSelector;
        this.hasValue = false;
    }

    if ( OuterSubscriber$$1 ) AuditSubscriber.__proto__ = OuterSubscriber$$1;
    AuditSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    AuditSubscriber.prototype.constructor = AuditSubscriber;
    AuditSubscriber.prototype._next = function _next (value) {
        this.value = value;
        this.hasValue = true;
        if (!this.throttled) {
            var duration = tryCatch(this.durationSelector)(value);
            if (duration === errorObject) {
                this.destination.error(errorObject.e);
            }
            else {
                this.add(this.throttled = subscribeToResult(this, duration));
            }
        }
    };
    AuditSubscriber.prototype.clearThrottle = function clearThrottle () {
        var ref = this;
        var value = ref.value;
        var hasValue = ref.hasValue;
        var throttled = ref.throttled;
        if (throttled) {
            this.remove(throttled);
            this.throttled = null;
            throttled.unsubscribe();
        }
        if (hasValue) {
            this.value = null;
            this.hasValue = false;
            this.destination.next(value);
        }
    };
    AuditSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex) {
        this.clearThrottle();
    };
    AuditSubscriber.prototype.notifyComplete = function notifyComplete () {
        this.clearThrottle();
    };

    return AuditSubscriber;
}(OuterSubscriber));

Observable.prototype.audit = audit;

/**
 * Ignores source values for `duration` milliseconds, then emits the most recent
 * value from the source Observable, then repeats this process.
 *
 * <span class="informal">When it sees a source values, it ignores that plus
 * the next ones for `duration` milliseconds, and then it emits the most recent
 * value from the source.</span>
 *
 * <img src="./img/auditTime.png" width="100%">
 *
 * `auditTime` is similar to `throttleTime`, but emits the last value from the
 * silenced time window, instead of the first value. `auditTime` emits the most
 * recent value from the source Observable on the output Observable as soon as
 * its internal timer becomes disabled, and ignores source values while the
 * timer is enabled. Initially, the timer is disabled. As soon as the first
 * source value arrives, the timer is enabled. After `duration` milliseconds (or
 * the time unit determined internally by the optional `scheduler`) has passed,
 * the timer is disabled, then the most recent source value is emitted on the
 * output Observable, and this process repeats for the next source value.
 * Optionally takes a {@link Scheduler} for managing timers.
 *
 * @example <caption>Emit clicks at a rate of at most one click per second</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.auditTime(1000);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link audit}
 * @see {@link debounceTime}
 * @see {@link delay}
 * @see {@link sampleTime}
 * @see {@link throttleTime}
 *
 * @param {number} duration Time to wait before emitting the most recent source
 * value, measured in milliseconds or the time unit determined internally
 * by the optional `scheduler`.
 * @param {Scheduler} [scheduler=async] The {@link Scheduler} to use for
 * managing the timers that handle the rate-limiting behavior.
 * @return {Observable<T>} An Observable that performs rate-limiting of
 * emissions from the source Observable.
 * @method auditTime
 * @owner Observable
 */
function auditTime(duration, scheduler) {
    if ( scheduler === void 0 ) scheduler = async;

    return this.lift(new AuditTimeOperator(duration, scheduler));
}
var AuditTimeOperator = function AuditTimeOperator(duration, scheduler) {
    this.duration = duration;
    this.scheduler = scheduler;
};
AuditTimeOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new AuditTimeSubscriber(subscriber, this.duration, this.scheduler));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var AuditTimeSubscriber = (function (Subscriber$$1) {
    function AuditTimeSubscriber(destination, duration, scheduler) {
        Subscriber$$1.call(this, destination);
        this.duration = duration;
        this.scheduler = scheduler;
        this.hasValue = false;
    }

    if ( Subscriber$$1 ) AuditTimeSubscriber.__proto__ = Subscriber$$1;
    AuditTimeSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    AuditTimeSubscriber.prototype.constructor = AuditTimeSubscriber;
    AuditTimeSubscriber.prototype._next = function _next (value) {
        this.value = value;
        this.hasValue = true;
        if (!this.throttled) {
            this.add(this.throttled = this.scheduler.schedule(dispatchNext$4, this.duration, this));
        }
    };
    AuditTimeSubscriber.prototype.clearThrottle = function clearThrottle () {
        var ref = this;
        var value = ref.value;
        var hasValue = ref.hasValue;
        var throttled = ref.throttled;
        if (throttled) {
            this.remove(throttled);
            this.throttled = null;
            throttled.unsubscribe();
        }
        if (hasValue) {
            this.value = null;
            this.hasValue = false;
            this.destination.next(value);
        }
    };

    return AuditTimeSubscriber;
}(Subscriber));
function dispatchNext$4(subscriber) {
    subscriber.clearThrottle();
}

Observable.prototype.auditTime = auditTime;

/**
 * Returns an Observable that emits only the last item emitted by the source Observable.
 * It optionally takes a predicate function as a parameter, in which case, rather than emitting
 * the last item from the source Observable, the resulting Observable will emit the last item
 * from the source Observable that satisfies the predicate.
 *
 * <img src="./img/last.png" width="100%">
 *
 * @throws {EmptyError} Delivers an EmptyError to the Observer's `error`
 * callback if the Observable completes before any `next` notification was sent.
 * @param {function} predicate - the condition any source emitted item has to satisfy.
 * @return {Observable} an Observable that emits only the last item satisfying the given condition
 * from the source, or an NoSuchElementException if no such items are emitted.
 * @throws - Throws if no items that match the predicate are emitted by the source Observable.
 * @method last
 * @owner Observable
 */
function last(predicate, resultSelector, defaultValue) {
    return this.lift(new LastOperator(predicate, resultSelector, defaultValue, this));
}
var LastOperator = function LastOperator(predicate, resultSelector, defaultValue, source) {
    this.predicate = predicate;
    this.resultSelector = resultSelector;
    this.defaultValue = defaultValue;
    this.source = source;
};
LastOperator.prototype.call = function call (observer, source) {
    return source._subscribe(new LastSubscriber(observer, this.predicate, this.resultSelector, this.defaultValue, this.source));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var LastSubscriber = (function (Subscriber$$1) {
    function LastSubscriber(destination, predicate, resultSelector, defaultValue, source) {
        Subscriber$$1.call(this, destination);
        this.predicate = predicate;
        this.resultSelector = resultSelector;
        this.defaultValue = defaultValue;
        this.source = source;
        this.hasValue = false;
        this.index = 0;
        if (typeof defaultValue !== 'undefined') {
            this.lastValue = defaultValue;
            this.hasValue = true;
        }
    }

    if ( Subscriber$$1 ) LastSubscriber.__proto__ = Subscriber$$1;
    LastSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    LastSubscriber.prototype.constructor = LastSubscriber;
    LastSubscriber.prototype._next = function _next (value) {
        var index = this.index++;
        if (this.predicate) {
            this._tryPredicate(value, index);
        }
        else {
            if (this.resultSelector) {
                this._tryResultSelector(value, index);
                return;
            }
            this.lastValue = value;
            this.hasValue = true;
        }
    };
    LastSubscriber.prototype._tryPredicate = function _tryPredicate (value, index) {
        var result;
        try {
            result = this.predicate(value, index, this.source);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        if (result) {
            if (this.resultSelector) {
                this._tryResultSelector(value, index);
                return;
            }
            this.lastValue = value;
            this.hasValue = true;
        }
    };
    LastSubscriber.prototype._tryResultSelector = function _tryResultSelector (value, index) {
        var result;
        try {
            result = this.resultSelector(value, index);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.lastValue = result;
        this.hasValue = true;
    };
    LastSubscriber.prototype._complete = function _complete () {
        var destination = this.destination;
        if (this.hasValue) {
            destination.next(this.lastValue);
            destination.complete();
        }
        else {
            destination.error(new EmptyError);
        }
    };

    return LastSubscriber;
}(Subscriber));

Observable.prototype.last = last;

/**
 * @param func
 * @return {Observable<R>}
 * @method let
 * @owner Observable
 */
function letProto(func) {
    return func(this);
}

Observable.prototype.let = letProto;
Observable.prototype.letBind = letProto;

/**
 * Returns an Observable that emits whether or not every item of the source satisfies the condition specified.
 * @param {function} predicate a function for determining if an item meets a specified condition.
 * @param {any} [thisArg] optional object to use for `this` in the callback
 * @return {Observable} an Observable of booleans that determines if all items of the source Observable meet the condition specified.
 * @method every
 * @owner Observable
 */
function every(predicate, thisArg) {
    return this.lift(new EveryOperator(predicate, thisArg, this));
}
var EveryOperator = function EveryOperator(predicate, thisArg, source) {
    this.predicate = predicate;
    this.thisArg = thisArg;
    this.source = source;
};
EveryOperator.prototype.call = function call (observer, source) {
    return source._subscribe(new EverySubscriber(observer, this.predicate, this.thisArg, this.source));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var EverySubscriber = (function (Subscriber$$1) {
    function EverySubscriber(destination, predicate, thisArg, source) {
        Subscriber$$1.call(this, destination);
        this.predicate = predicate;
        this.thisArg = thisArg;
        this.source = source;
        this.index = 0;
        this.thisArg = thisArg || this;
    }

    if ( Subscriber$$1 ) EverySubscriber.__proto__ = Subscriber$$1;
    EverySubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    EverySubscriber.prototype.constructor = EverySubscriber;
    EverySubscriber.prototype.notifyComplete = function notifyComplete (everyValueMatch) {
        this.destination.next(everyValueMatch);
        this.destination.complete();
    };
    EverySubscriber.prototype._next = function _next (value) {
        var result = false;
        try {
            result = this.predicate.call(this.thisArg, value, this.index++, this.source);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        if (!result) {
            this.notifyComplete(false);
        }
    };
    EverySubscriber.prototype._complete = function _complete () {
        this.notifyComplete(true);
    };

    return EverySubscriber;
}(Subscriber));

Observable.prototype.every = every;

Observable.prototype.map = map;

/**
 * Emits the given constant value on the output Observable every time the source
 * Observable emits a value.
 *
 * <span class="informal">Like {@link map}, but it maps every source value to
 * the same output value every time.</span>
 *
 * <img src="./img/mapTo.png" width="100%">
 *
 * Takes a constant `value` as argument, and emits that whenever the source
 * Observable emits a value. In other words, ignores the actual source value,
 * and simply uses the emission moment to know when to emit the given `value`.
 *
 * @example <caption>Map every every click to the string 'Hi'</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var greetings = clicks.mapTo('Hi');
 * greetings.subscribe(x => console.log(x));
 *
 * @see {@link map}
 *
 * @param {any} value The value to map each source value to.
 * @return {Observable} An Observable that emits the given `value` every time
 * the source Observable emits something.
 * @method mapTo
 * @owner Observable
 */
function mapTo(value) {
    return this.lift(new MapToOperator(value));
}
var MapToOperator = function MapToOperator(value) {
    this.value = value;
};
MapToOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new MapToSubscriber(subscriber, this.value));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var MapToSubscriber = (function (Subscriber$$1) {
    function MapToSubscriber(destination, value) {
        Subscriber$$1.call(this, destination);
        this.value = value;
    }

    if ( Subscriber$$1 ) MapToSubscriber.__proto__ = Subscriber$$1;
    MapToSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    MapToSubscriber.prototype.constructor = MapToSubscriber;
    MapToSubscriber.prototype._next = function _next (x) {
        this.destination.next(this.value);
    };

    return MapToSubscriber;
}(Subscriber));

Observable.prototype.mapTo = mapTo;

/**
 * Represents all of the notifications from the source Observable as `next`
 * emissions marked with their original types within {@link Notification}
 * objects.
 *
 * <span class="informal">Wraps `next`, `error` and `complete` emissions in
 * {@link Notification} objects, emitted as `next` on the output Observable.
 * </span>
 *
 * <img src="./img/materialize.png" width="100%">
 *
 * `materialize` returns an Observable that emits a `next` notification for each
 * `next`, `error`, or `complete` emission of the source Observable. When the
 * source Observable emits `complete`, the output Observable will emit `next` as
 * a Notification of type "complete", and then it will emit `complete` as well.
 * When the source Observable emits `error`, the output will emit `next` as a
 * Notification of type "error", and then `complete`.
 *
 * This operator is useful for producing metadata of the source Observable, to
 * be consumed as `next` emissions. Use it in conjunction with
 * {@link dematerialize}.
 *
 * @example <caption>Convert a faulty Observable to an Observable of Notifications</caption>
 * var letters = Rx.Observable.of('a', 'b', 13, 'd');
 * var upperCase = letters.map(x => x.toUpperCase());
 * var materialized = upperCase.materialize();
 * materialized.subscribe(x => console.log(x));
 *
 * @see {@link Notification}
 * @see {@link dematerialize}
 *
 * @return {Observable<Notification<T>>} An Observable that emits
 * {@link Notification} objects that wrap the original emissions from the source
 * Observable with metadata.
 * @method materialize
 * @owner Observable
 */
function materialize() {
    return this.lift(new MaterializeOperator());
}
var MaterializeOperator = function MaterializeOperator () {};

MaterializeOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new MaterializeSubscriber(subscriber));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var MaterializeSubscriber = (function (Subscriber$$1) {
    function MaterializeSubscriber(destination) {
        Subscriber$$1.call(this, destination);
    }

    if ( Subscriber$$1 ) MaterializeSubscriber.__proto__ = Subscriber$$1;
    MaterializeSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    MaterializeSubscriber.prototype.constructor = MaterializeSubscriber;
    MaterializeSubscriber.prototype._next = function _next (value) {
        this.destination.next(Notification.createNext(value));
    };
    MaterializeSubscriber.prototype._error = function _error (err) {
        var destination = this.destination;
        destination.next(Notification.createError(err));
        destination.complete();
    };
    MaterializeSubscriber.prototype._complete = function _complete () {
        var destination = this.destination;
        destination.next(Notification.createComplete());
        destination.complete();
    };

    return MaterializeSubscriber;
}(Subscriber));

Observable.prototype.materialize = materialize;

/**
 * Applies an accumulator function over the source Observable, and returns the
 * accumulated result when the source completes, given an optional seed value.
 *
 * <span class="informal">Combines together all values emitted on the source,
 * using an accumulator function that knows how to join a new source value into
 * the accumulation from the past.</span>
 *
 * <img src="./img/reduce.png" width="100%">
 *
 * Like
 * [Array.prototype.reduce()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce),
 * `reduce` applies an `accumulator` function against an accumulation and each
 * value of the source Observable (from the past) to reduce it to a single
 * value, emitted on the output Observable. Note that `reduce` will only emit
 * one value, only when the source Observable completes. It is equivalent to
 * applying operator {@link scan} followed by operator {@link last}.
 *
 * Returns an Observable that applies a specified `accumulator` function to each
 * item emitted by the source Observable. If a `seed` value is specified, then
 * that value will be used as the initial value for the accumulator. If no seed
 * value is specified, the first item of the source is used as the seed.
 *
 * @example <caption>Count the number of click events that happened in 5 seconds</caption>
 * var clicksInFiveSeconds = Rx.Observable.fromEvent(document, 'click')
 *   .takeUntil(Rx.Observable.interval(5000));
 * var ones = clicksInFiveSeconds.mapTo(1);
 * var seed = 0;
 * var count = ones.reduce((acc, one) => acc + one, seed);
 * count.subscribe(x => console.log(x));
 *
 * @see {@link count}
 * @see {@link expand}
 * @see {@link mergeScan}
 * @see {@link scan}
 *
 * @param {function(acc: R, value: T): R} accumulator The accumulator function
 * called on each source value.
 * @param {R} [seed] The initial accumulation value.
 * @return {Observable<R>} An observable of the accumulated values.
 * @return {Observable<R>} An Observable that emits a single value that is the
 * result of accumulating the values emitted by the source Observable.
 * @method reduce
 * @owner Observable
 */
function reduce(accumulator, seed) {
    return this.lift(new ReduceOperator(accumulator, seed));
}
var ReduceOperator = function ReduceOperator(accumulator, seed) {
    this.accumulator = accumulator;
    this.seed = seed;
};
ReduceOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new ReduceSubscriber(subscriber, this.accumulator, this.seed));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ReduceSubscriber = (function (Subscriber$$1) {
    function ReduceSubscriber(destination, accumulator, seed) {
        Subscriber$$1.call(this, destination);
        this.accumulator = accumulator;
        this.hasValue = false;
        this.acc = seed;
        this.accumulator = accumulator;
        this.hasSeed = typeof seed !== 'undefined';
    }

    if ( Subscriber$$1 ) ReduceSubscriber.__proto__ = Subscriber$$1;
    ReduceSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    ReduceSubscriber.prototype.constructor = ReduceSubscriber;
    ReduceSubscriber.prototype._next = function _next (value) {
        if (this.hasValue || (this.hasValue = this.hasSeed)) {
            this._tryReduce(value);
        }
        else {
            this.acc = value;
            this.hasValue = true;
        }
    };
    ReduceSubscriber.prototype._tryReduce = function _tryReduce (value) {
        var result;
        try {
            result = this.accumulator(this.acc, value);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.acc = result;
    };
    ReduceSubscriber.prototype._complete = function _complete () {
        if (this.hasValue || this.hasSeed) {
            this.destination.next(this.acc);
        }
        this.destination.complete();
    };

    return ReduceSubscriber;
}(Subscriber));

/**
 * The Max operator operates on an Observable that emits numbers (or items that can be evaluated as numbers),
 * and when source Observable completes it emits a single item: the item with the largest number.
 *
 * <img src="./img/max.png" width="100%">
 *
 * @param {Function} optional comparer function that it will use instead of its default to compare the value of two
 * items.
 * @return {Observable} an Observable that emits item with the largest number.
 * @method max
 * @owner Observable
 */
function max(comparer) {
    var max = (typeof comparer === 'function')
        ? function (x, y) { return comparer(x, y) > 0 ? x : y; }
        : function (x, y) { return x > y ? x : y; };
    return this.lift(new ReduceOperator(max));
}

Observable.prototype.max = max;

Observable.prototype.merge = merge$1;

Observable.prototype.mergeAll = mergeAll;

Observable.prototype.mergeMap = mergeMap;
Observable.prototype.flatMap = mergeMap;

Observable.prototype.flatMapTo = mergeMapTo;
Observable.prototype.mergeMapTo = mergeMapTo;

/**
 * @param project
 * @param seed
 * @param concurrent
 * @return {Observable<R>|WebSocketSubject<T>|Observable<T>}
 * @method mergeScan
 * @owner Observable
 */
function mergeScan(project, seed, concurrent) {
    if ( concurrent === void 0 ) concurrent = Number.POSITIVE_INFINITY;

    return this.lift(new MergeScanOperator(project, seed, concurrent));
}
var MergeScanOperator = function MergeScanOperator(project, seed, concurrent) {
    this.project = project;
    this.seed = seed;
    this.concurrent = concurrent;
};
MergeScanOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new MergeScanSubscriber(subscriber, this.project, this.seed, this.concurrent));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var MergeScanSubscriber = (function (OuterSubscriber$$1) {
    function MergeScanSubscriber(destination, project, acc, concurrent) {
        OuterSubscriber$$1.call(this, destination);
        this.project = project;
        this.acc = acc;
        this.concurrent = concurrent;
        this.hasValue = false;
        this.hasCompleted = false;
        this.buffer = [];
        this.active = 0;
        this.index = 0;
    }

    if ( OuterSubscriber$$1 ) MergeScanSubscriber.__proto__ = OuterSubscriber$$1;
    MergeScanSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    MergeScanSubscriber.prototype.constructor = MergeScanSubscriber;
    MergeScanSubscriber.prototype._next = function _next (value) {
        if (this.active < this.concurrent) {
            var index = this.index++;
            var ish = tryCatch(this.project)(this.acc, value);
            var destination = this.destination;
            if (ish === errorObject) {
                destination.error(errorObject.e);
            }
            else {
                this.active++;
                this._innerSub(ish, value, index);
            }
        }
        else {
            this.buffer.push(value);
        }
    };
    MergeScanSubscriber.prototype._innerSub = function _innerSub (ish, value, index) {
        this.add(subscribeToResult(this, ish, value, index));
    };
    MergeScanSubscriber.prototype._complete = function _complete () {
        this.hasCompleted = true;
        if (this.active === 0 && this.buffer.length === 0) {
            if (this.hasValue === false) {
                this.destination.next(this.acc);
            }
            this.destination.complete();
        }
    };
    MergeScanSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        var ref = this;
        var destination = ref.destination;
        this.acc = innerValue;
        this.hasValue = true;
        destination.next(innerValue);
    };
    MergeScanSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        var buffer = this.buffer;
        this.remove(innerSub);
        this.active--;
        if (buffer.length > 0) {
            this._next(buffer.shift());
        }
        else if (this.active === 0 && this.hasCompleted) {
            if (this.hasValue === false) {
                this.destination.next(this.acc);
            }
            this.destination.complete();
        }
    };

    return MergeScanSubscriber;
}(OuterSubscriber));

Observable.prototype.mergeScan = mergeScan;

/**
 * The Min operator operates on an Observable that emits numbers (or items that can be evaluated as numbers),
 * and when source Observable completes it emits a single item: the item with the smallest number.
 *
 * <img src="./img/min.png" width="100%">
 *
 * @param {Function} optional comparer function that it will use instead of its default to compare the value of two items.
 * @return {Observable<R>} an Observable that emits item with the smallest number.
 * @method min
 * @owner Observable
 */
function min(comparer) {
    var min = (typeof comparer === 'function')
        ? function (x, y) { return comparer(x, y) < 0 ? x : y; }
        : function (x, y) { return x < y ? x : y; };
    return this.lift(new ReduceOperator(min));
}

Observable.prototype.min = min;

/**
 * @class ConnectableObservable<T>
 */
var ConnectableObservable = (function (Observable$$1) {
    function ConnectableObservable(source, subjectFactory) {
        Observable$$1.call(this);
        this.source = source;
        this.subjectFactory = subjectFactory;
        this._refCount = 0;
    }

    if ( Observable$$1 ) ConnectableObservable.__proto__ = Observable$$1;
    ConnectableObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    ConnectableObservable.prototype.constructor = ConnectableObservable;
    ConnectableObservable.prototype._subscribe = function _subscribe (subscriber) {
        return this.getSubject().subscribe(subscriber);
    };
    ConnectableObservable.prototype.getSubject = function getSubject () {
        var subject = this._subject;
        if (!subject || subject.isStopped) {
            this._subject = this.subjectFactory();
        }
        return this._subject;
    };
    ConnectableObservable.prototype.connect = function connect () {
        var connection = this._connection;
        if (!connection) {
            connection = this._connection = new Subscription();
            connection.add(this.source
                .subscribe(new ConnectableSubscriber(this.getSubject(), this)));
            if (connection.closed) {
                this._connection = null;
                connection = Subscription.EMPTY;
            }
            else {
                this._connection = connection;
            }
        }
        return connection;
    };
    ConnectableObservable.prototype.refCount = function refCount () {
        return this.lift(new RefCountOperator(this));
    };

    return ConnectableObservable;
}(Observable));
var ConnectableSubscriber = (function (SubjectSubscriber$$1) {
    function ConnectableSubscriber(destination, connectable) {
        SubjectSubscriber$$1.call(this, destination);
        this.connectable = connectable;
    }

    if ( SubjectSubscriber$$1 ) ConnectableSubscriber.__proto__ = SubjectSubscriber$$1;
    ConnectableSubscriber.prototype = Object.create( SubjectSubscriber$$1 && SubjectSubscriber$$1.prototype );
    ConnectableSubscriber.prototype.constructor = ConnectableSubscriber;
    ConnectableSubscriber.prototype._error = function _error (err) {
        this._unsubscribe();
        SubjectSubscriber$$1.prototype._error.call(this, err);
    };
    ConnectableSubscriber.prototype._complete = function _complete () {
        this._unsubscribe();
        SubjectSubscriber$$1.prototype._complete.call(this);
    };
    ConnectableSubscriber.prototype._unsubscribe = function _unsubscribe () {
        var ref = this;
        var connectable = ref.connectable;
        if (connectable) {
            this.connectable = null;
            var connection = connectable._connection;
            connectable._refCount = 0;
            connectable._subject = null;
            connectable._connection = null;
            if (connection) {
                connection.unsubscribe();
            }
        }
    };

    return ConnectableSubscriber;
}(SubjectSubscriber));
var RefCountOperator = function RefCountOperator(connectable) {
    this.connectable = connectable;
};
RefCountOperator.prototype.call = function call (subscriber, source) {
    var ref = this;
        var connectable = ref.connectable;
    connectable._refCount++;
    var refCounter = new RefCountSubscriber(subscriber, connectable);
    var subscription = source._subscribe(refCounter);
    if (!refCounter.closed) {
        refCounter.connection = connectable.connect();
    }
    return subscription;
};
var RefCountSubscriber = (function (Subscriber$$1) {
    function RefCountSubscriber(destination, connectable) {
        Subscriber$$1.call(this, destination);
        this.connectable = connectable;
    }

    if ( Subscriber$$1 ) RefCountSubscriber.__proto__ = Subscriber$$1;
    RefCountSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    RefCountSubscriber.prototype.constructor = RefCountSubscriber;
    RefCountSubscriber.prototype._unsubscribe = function _unsubscribe () {
        var ref = this;
        var connectable = ref.connectable;
        if (!connectable) {
            this.connection = null;
            return;
        }
        this.connectable = null;
        var refCount = connectable._refCount;
        if (refCount <= 0) {
            this.connection = null;
            return;
        }
        connectable._refCount = refCount - 1;
        if (refCount > 1) {
            this.connection = null;
            return;
        }
        ///
        // Compare the local RefCountSubscriber's connection Subscription to the
        // connection Subscription on the shared ConnectableObservable. In cases
        // where the ConnectableObservable source synchronously emits values, and
        // the RefCountSubscriber's dowstream Observers synchronously unsubscribe,
        // execution continues to here before the RefCountOperator has a chance to
        // supply the RefCountSubscriber with the shared connection Subscription.
        // For example:
        // ```
        // Observable.range(0, 10)
        //   .publish()
        //   .refCount()
        //   .take(5)
        //   .subscribe();
        // ```
        // In order to account for this case, RefCountSubscriber should only dispose
        // the ConnectableObservable's shared connection Subscription if the
        // connection Subscription exists, *and* either:
        //   a. RefCountSubscriber doesn't have a reference to the shared connection
        //      Subscription yet, or,
        //   b. RefCountSubscriber's connection Subscription reference is identical
        //      to the shared connection Subscription
        ///
        var ref$1 = this;
        var connection = ref$1.connection;
        var sharedConnection = connectable._connection;
        this.connection = null;
        if (sharedConnection && (!connection || sharedConnection === connection)) {
            sharedConnection.unsubscribe();
        }
    };

    return RefCountSubscriber;
}(Subscriber));

var MulticastObservable = (function (Observable$$1) {
    function MulticastObservable(source, subjectFactory, selector) {
        Observable$$1.call(this);
        this.source = source;
        this.subjectFactory = subjectFactory;
        this.selector = selector;
    }

    if ( Observable$$1 ) MulticastObservable.__proto__ = Observable$$1;
    MulticastObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    MulticastObservable.prototype.constructor = MulticastObservable;
    MulticastObservable.prototype._subscribe = function _subscribe (subscriber) {
        var ref = this;
        var selector = ref.selector;
        var source = ref.source;
        var connectable = new ConnectableObservable(source, this.subjectFactory);
        var subscription = selector(connectable).subscribe(subscriber);
        subscription.add(connectable.connect());
        return subscription;
    };

    return MulticastObservable;
}(Observable));

/**
 * Returns an Observable that emits the results of invoking a specified selector on items
 * emitted by a ConnectableObservable that shares a single subscription to the underlying stream.
 *
 * <img src="./img/multicast.png" width="100%">
 *
 * @param {Function|Subject} Factory function to create an intermediate subject through
 * which the source sequence's elements will be multicast to the selector function
 * or Subject to push source elements into.
 * @param {Function} Optional selector function that can use the multicasted source stream
 * as many times as needed, without causing multiple subscriptions to the source stream.
 * Subscribers to the given source will receive all notifications of the source from the
 * time of the subscription forward.
 * @return {Observable} an Observable that emits the results of invoking the selector
 * on the items emitted by a `ConnectableObservable` that shares a single subscription to
 * the underlying stream.
 * @method multicast
 * @owner Observable
 */
function multicast(subjectOrSubjectFactory, selector) {
    var subjectFactory;
    if (typeof subjectOrSubjectFactory === 'function') {
        subjectFactory = subjectOrSubjectFactory;
    }
    else {
        subjectFactory = function subjectFactory() {
            return subjectOrSubjectFactory;
        };
    }
    return !selector ?
        new ConnectableObservable(this, subjectFactory) :
        new MulticastObservable(this, subjectFactory, selector);
}

Observable.prototype.multicast = multicast;

Observable.prototype.observeOn = observeOn;

Observable.prototype.onErrorResumeNext = onErrorResumeNext;

/**
 * Groups pairs of consecutive emissions together and emits them as an array of
 * two values.
 *
 * <span class="informal">Puts the current value and previous value together as
 * an array, and emits that.</span>
 *
 * <img src="./img/pairwise.png" width="100%">
 *
 * The Nth emission from the source Observable will cause the output Observable
 * to emit an array [(N-1)th, Nth] of the previous and the current value, as a
 * pair. For this reason, `pairwise` emits on the second and subsequent
 * emissions from the source Observable, but not on the first emission, because
 * there is no previous value in that case.
 *
 * @example <caption>On every click (starting from the second), emit the relative distance to the previous click</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var pairs = clicks.pairwise();
 * var distance = pairs.map(pair => {
 *   var x0 = pair[0].clientX;
 *   var y0 = pair[0].clientY;
 *   var x1 = pair[1].clientX;
 *   var y1 = pair[1].clientY;
 *   return Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2));
 * });
 * distance.subscribe(x => console.log(x));
 *
 * @see {@link buffer}
 * @see {@link bufferCount}
 *
 * @return {Observable<Array<T>>} An Observable of pairs (as arrays) of
 * consecutive values from the source Observable.
 * @method pairwise
 * @owner Observable
 */
function pairwise() {
    return this.lift(new PairwiseOperator());
}
var PairwiseOperator = function PairwiseOperator () {};

PairwiseOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new PairwiseSubscriber(subscriber));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var PairwiseSubscriber = (function (Subscriber$$1) {
    function PairwiseSubscriber(destination) {
        Subscriber$$1.call(this, destination);
        this.hasPrev = false;
    }

    if ( Subscriber$$1 ) PairwiseSubscriber.__proto__ = Subscriber$$1;
    PairwiseSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    PairwiseSubscriber.prototype.constructor = PairwiseSubscriber;
    PairwiseSubscriber.prototype._next = function _next (value) {
        if (this.hasPrev) {
            this.destination.next([this.prev, value]);
        }
        else {
            this.hasPrev = true;
        }
        this.prev = value;
    };

    return PairwiseSubscriber;
}(Subscriber));

Observable.prototype.pairwise = pairwise;

function not(pred, thisArg) {
    function notPred() {
        return !(notPred.pred.apply(notPred.thisArg, arguments));
    }
    notPred.pred = pred;
    notPred.thisArg = thisArg;
    return notPred;
}

/**
 * Splits the source Observable into two, one with values that satisfy a
 * predicate, and another with values that don't satisfy the predicate.
 *
 * <span class="informal">It's like {@link filter}, but returns two Observables:
 * one like the output of {@link filter}, and the other with values that did not
 * pass the condition.</span>
 *
 * <img src="./img/partition.png" width="100%">
 *
 * `partition` outputs an array with two Observables that partition the values
 * from the source Observable through the given `predicate` function. The first
 * Observable in that array emits source values for which the predicate argument
 * returns true. The second Observable emits source values for which the
 * predicate returns false. The first behaves like {@link filter} and the second
 * behaves like {@link filter} with the predicate negated.
 *
 * @example <caption>Partition click events into those on DIV elements and those elsewhere</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var parts = clicks.partition(ev => ev.target.tagName === 'DIV');
 * var clicksOnDivs = parts[0];
 * var clicksElsewhere = parts[1];
 * clicksOnDivs.subscribe(x => console.log('DIV clicked: ', x));
 * clicksElsewhere.subscribe(x => console.log('Other clicked: ', x));
 *
 * @see {@link filter}
 *
 * @param {function(value: T, index: number): boolean} predicate A function that
 * evaluates each value emitted by the source Observable. If it returns `true`,
 * the value is emitted on the first Observable in the returned array, if
 * `false` the value is emitted on the second Observable in the array. The
 * `index` parameter is the number `i` for the i-th source emission that has
 * happened since the subscription, starting from the number `0`.
 * @param {any} [thisArg] An optional argument to determine the value of `this`
 * in the `predicate` function.
 * @return {[Observable<T>, Observable<T>]} An array with two Observables: one
 * with values that passed the predicate, and another with values that did not
 * pass the predicate.
 * @method partition
 * @owner Observable
 */
function partition(predicate, thisArg) {
    return [
        filter.call(this, predicate),
        filter.call(this, not(predicate, thisArg))
    ];
}

Observable.prototype.partition = partition;

/**
 * Maps each source value (an object) to its specified nested property.
 *
 * <span class="informal">Like {@link map}, but meant only for picking one of
 * the nested properties of every emitted object.</span>
 *
 * <img src="./img/pluck.png" width="100%">
 *
 * Given a list of strings describing a path to an object property, retrieves
 * the value of a specified nested property from all values in the source
 * Observable. If a property can't be resolved, it will return `undefined` for
 * that value.
 *
 * @example <caption>Map every every click to the tagName of the clicked target element</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var tagNames = clicks.pluck('target', 'tagName');
 * tagNames.subscribe(x => console.log(x));
 *
 * @see {@link map}
 *
 * @param {...string} properties The nested properties to pluck from each source
 * value (an object).
 * @return {Observable} Returns a new Observable of property values from the
 * source values.
 * @method pluck
 * @owner Observable
 */
function pluck() {
    var properties = [], len = arguments.length;
    while ( len-- ) properties[ len ] = arguments[ len ];

    var length = properties.length;
    if (length === 0) {
        throw new Error('list of properties cannot be empty.');
    }
    return map.call(this, plucker(properties, length));
}
function plucker(props, length) {
    var mapper = function (x) {
        var currentProp = x;
        for (var i = 0; i < length; i++) {
            var p = currentProp[props[i]];
            if (typeof p !== 'undefined') {
                currentProp = p;
            }
            else {
                return undefined;
            }
        }
        return currentProp;
    };
    return mapper;
}

Observable.prototype.pluck = pluck;

/**
 * Returns a ConnectableObservable, which is a variety of Observable that waits until its connect method is called
 * before it begins emitting items to those Observers that have subscribed to it.
 *
 * <img src="./img/publish.png" width="100%">
 *
 * @param {Function} Optional selector function which can use the multicasted source sequence as many times as needed,
 * without causing multiple subscriptions to the source sequence.
 * Subscribers to the given source will receive all notifications of the source from the time of the subscription on.
 * @return a ConnectableObservable that upon connection causes the source Observable to emit items to its Observers.
 * @method publish
 * @owner Observable
 */
function publish(selector) {
    return selector ? multicast.call(this, function () { return new Subject(); }, selector) :
        multicast.call(this, new Subject());
}

Observable.prototype.publish = publish;

/**
 * @class BehaviorSubject<T>
 */
var BehaviorSubject = (function (Subject$$1) {
    function BehaviorSubject(_value) {
        Subject$$1.call(this);
        this._value = _value;
    }

    if ( Subject$$1 ) BehaviorSubject.__proto__ = Subject$$1;
    BehaviorSubject.prototype = Object.create( Subject$$1 && Subject$$1.prototype );
    BehaviorSubject.prototype.constructor = BehaviorSubject;

    var prototypeAccessors = { value: {} };
    prototypeAccessors.value.get = function () {
        return this.getValue();
    };
    BehaviorSubject.prototype._subscribe = function _subscribe (subscriber) {
        var subscription = Subject$$1.prototype._subscribe.call(this, subscriber);
        if (subscription && !subscription.closed) {
            subscriber.next(this._value);
        }
        return subscription;
    };
    BehaviorSubject.prototype.getValue = function getValue () {
        if (this.hasError) {
            throw this.thrownError;
        }
        else if (this.closed) {
            throw new ObjectUnsubscribedError();
        }
        else {
            return this._value;
        }
    };
    BehaviorSubject.prototype.next = function next (value) {
        Subject$$1.prototype.next.call(this, this._value = value);
    };

    Object.defineProperties( BehaviorSubject.prototype, prototypeAccessors );

    return BehaviorSubject;
}(Subject));

/**
 * @param value
 * @return {ConnectableObservable<T>}
 * @method publishBehavior
 * @owner Observable
 */
function publishBehavior(value) {
    return multicast.call(this, new BehaviorSubject(value));
}

Observable.prototype.publishBehavior = publishBehavior;

/**
 * @param bufferSize
 * @param windowTime
 * @param scheduler
 * @return {ConnectableObservable<T>}
 * @method publishReplay
 * @owner Observable
 */
function publishReplay(bufferSize, windowTime, scheduler) {
    if ( bufferSize === void 0 ) bufferSize = Number.POSITIVE_INFINITY;
    if ( windowTime === void 0 ) windowTime = Number.POSITIVE_INFINITY;

    return multicast.call(this, new ReplaySubject(bufferSize, windowTime, scheduler));
}

Observable.prototype.publishReplay = publishReplay;

/**
 * @return {ConnectableObservable<T>}
 * @method publishLast
 * @owner Observable
 */
function publishLast() {
    return multicast.call(this, new AsyncSubject());
}

Observable.prototype.publishLast = publishLast;

Observable.prototype.race = race;

Observable.prototype.reduce = reduce;

/**
 * Returns an Observable that repeats the stream of items emitted by the source Observable at most count times,
 * on a particular Scheduler.
 *
 * <img src="./img/repeat.png" width="100%">
 *
 * @param {Scheduler} [scheduler] the Scheduler to emit the items on.
 * @param {number} [count] the number of times the source Observable items are repeated, a count of 0 will yield
 * an empty Observable.
 * @return {Observable} an Observable that repeats the stream of items emitted by the source Observable at most
 * count times.
 * @method repeat
 * @owner Observable
 */
function repeat(count) {
    if ( count === void 0 ) count = -1;

    if (count === 0) {
        return new EmptyObservable();
    }
    else if (count < 0) {
        return this.lift(new RepeatOperator(-1, this));
    }
    else {
        return this.lift(new RepeatOperator(count - 1, this));
    }
}
var RepeatOperator = function RepeatOperator(count, source) {
    this.count = count;
    this.source = source;
};
RepeatOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new RepeatSubscriber(subscriber, this.count, this.source));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var RepeatSubscriber = (function (Subscriber$$1) {
    function RepeatSubscriber(destination, count, source) {
        Subscriber$$1.call(this, destination);
        this.count = count;
        this.source = source;
    }

    if ( Subscriber$$1 ) RepeatSubscriber.__proto__ = Subscriber$$1;
    RepeatSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    RepeatSubscriber.prototype.constructor = RepeatSubscriber;
    RepeatSubscriber.prototype.complete = function complete () {
        if (!this.isStopped) {
            var ref = this;
            var source = ref.source;
            var count = ref.count;
            if (count === 0) {
                return Subscriber$$1.prototype.complete.call(this);
            }
            else if (count > -1) {
                this.count = count - 1;
            }
            this.unsubscribe();
            this.isStopped = false;
            this.closed = false;
            source.subscribe(this);
        }
    };

    return RepeatSubscriber;
}(Subscriber));

Observable.prototype.repeat = repeat;

/**
 * Returns an Observable that emits the same values as the source observable with the exception of a `complete`.
 * A `complete` will cause the emission of the Throwable that cause the complete to the Observable returned from
 * notificationHandler. If that Observable calls onComplete or `complete` then retry will call `complete` or `error`
 * on the child subscription. Otherwise, this Observable will resubscribe to the source observable, on a particular
 * Scheduler.
 *
 * <img src="./img/repeatWhen.png" width="100%">
 *
 * @param {notificationHandler} receives an Observable of notifications with which a user can `complete` or `error`,
 * aborting the retry.
 * @param {scheduler} the Scheduler on which to subscribe to the source Observable.
 * @return {Observable} the source Observable modified with retry logic.
 * @method repeatWhen
 * @owner Observable
 */
function repeatWhen(notifier) {
    return this.lift(new RepeatWhenOperator(notifier, this));
}
var RepeatWhenOperator = function RepeatWhenOperator(notifier, source) {
    this.notifier = notifier;
    this.source = source;
};
RepeatWhenOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new RepeatWhenSubscriber(subscriber, this.notifier, this.source));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var RepeatWhenSubscriber = (function (OuterSubscriber$$1) {
    function RepeatWhenSubscriber(destination, notifier, source) {
        OuterSubscriber$$1.call(this, destination);
        this.notifier = notifier;
        this.source = source;
    }

    if ( OuterSubscriber$$1 ) RepeatWhenSubscriber.__proto__ = OuterSubscriber$$1;
    RepeatWhenSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    RepeatWhenSubscriber.prototype.constructor = RepeatWhenSubscriber;
    RepeatWhenSubscriber.prototype.complete = function complete () {
        if (!this.isStopped) {
            var notifications = this.notifications;
            var retries = this.retries;
            var retriesSubscription = this.retriesSubscription;
            if (!retries) {
                notifications = new Subject();
                retries = tryCatch(this.notifier)(notifications);
                if (retries === errorObject) {
                    return OuterSubscriber$$1.prototype.complete.call(this);
                }
                retriesSubscription = subscribeToResult(this, retries);
            }
            else {
                this.notifications = null;
                this.retriesSubscription = null;
            }
            this.unsubscribe();
            this.closed = false;
            this.notifications = notifications;
            this.retries = retries;
            this.retriesSubscription = retriesSubscription;
            notifications.next();
        }
    };
    RepeatWhenSubscriber.prototype._unsubscribe = function _unsubscribe () {
        var ref = this;
        var notifications = ref.notifications;
        var retriesSubscription = ref.retriesSubscription;
        if (notifications) {
            notifications.unsubscribe();
            this.notifications = null;
        }
        if (retriesSubscription) {
            retriesSubscription.unsubscribe();
            this.retriesSubscription = null;
        }
        this.retries = null;
    };
    RepeatWhenSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        var ref = this;
        var notifications = ref.notifications;
        var retries = ref.retries;
        var retriesSubscription = ref.retriesSubscription;
        this.notifications = null;
        this.retries = null;
        this.retriesSubscription = null;
        this.unsubscribe();
        this.isStopped = false;
        this.closed = false;
        this.notifications = notifications;
        this.retries = retries;
        this.retriesSubscription = retriesSubscription;
        this.source.subscribe(this);
    };

    return RepeatWhenSubscriber;
}(OuterSubscriber));

Observable.prototype.repeatWhen = repeatWhen;

/**
 * Returns an Observable that mirrors the source Observable, resubscribing to it if it calls `error` and the
 * predicate returns true for that specific exception and retry count.
 * If the source Observable calls `error`, this method will resubscribe to the source Observable for a maximum of
 * count resubscriptions (given as a number parameter) rather than propagating the `error` call.
 *
 * <img src="./img/retry.png" width="100%">
 *
 * Any and all items emitted by the source Observable will be emitted by the resulting Observable, even those emitted
 * during failed subscriptions. For example, if an Observable fails at first but emits [1, 2] then succeeds the second
 * time and emits: [1, 2, 3, 4, 5] then the complete stream of emissions and notifications
 * would be: [1, 2, 1, 2, 3, 4, 5, `complete`].
 * @param {number} number of retry attempts before failing.
 * @return {Observable} the source Observable modified with the retry logic.
 * @method retry
 * @owner Observable
 */
function retry(count) {
    if ( count === void 0 ) count = -1;

    return this.lift(new RetryOperator(count, this));
}
var RetryOperator = function RetryOperator(count, source) {
    this.count = count;
    this.source = source;
};
RetryOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new RetrySubscriber(subscriber, this.count, this.source));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var RetrySubscriber = (function (Subscriber$$1) {
    function RetrySubscriber(destination, count, source) {
        Subscriber$$1.call(this, destination);
        this.count = count;
        this.source = source;
    }

    if ( Subscriber$$1 ) RetrySubscriber.__proto__ = Subscriber$$1;
    RetrySubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    RetrySubscriber.prototype.constructor = RetrySubscriber;
    RetrySubscriber.prototype.error = function error (err) {
        if (!this.isStopped) {
            var ref = this;
            var source = ref.source;
            var count = ref.count;
            if (count === 0) {
                return Subscriber$$1.prototype.error.call(this, err);
            }
            else if (count > -1) {
                this.count = count - 1;
            }
            this.unsubscribe();
            this.isStopped = false;
            this.closed = false;
            source.subscribe(this);
        }
    };

    return RetrySubscriber;
}(Subscriber));

Observable.prototype.retry = retry;

/**
 * Returns an Observable that emits the same values as the source observable with the exception of an `error`.
 * An `error` will cause the emission of the Throwable that cause the error to the Observable returned from
 * notificationHandler. If that Observable calls onComplete or `error` then retry will call `complete` or `error`
 * on the child subscription. Otherwise, this Observable will resubscribe to the source observable, on a particular
 * Scheduler.
 *
 * <img src="./img/retryWhen.png" width="100%">
 *
 * @param {notificationHandler} receives an Observable of notifications with which a user can `complete` or `error`,
 * aborting the retry.
 * @param {scheduler} the Scheduler on which to subscribe to the source Observable.
 * @return {Observable} the source Observable modified with retry logic.
 * @method retryWhen
 * @owner Observable
 */
function retryWhen(notifier) {
    return this.lift(new RetryWhenOperator(notifier, this));
}
var RetryWhenOperator = function RetryWhenOperator(notifier, source) {
    this.notifier = notifier;
    this.source = source;
};
RetryWhenOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new RetryWhenSubscriber(subscriber, this.notifier, this.source));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var RetryWhenSubscriber = (function (OuterSubscriber$$1) {
    function RetryWhenSubscriber(destination, notifier, source) {
        OuterSubscriber$$1.call(this, destination);
        this.notifier = notifier;
        this.source = source;
    }

    if ( OuterSubscriber$$1 ) RetryWhenSubscriber.__proto__ = OuterSubscriber$$1;
    RetryWhenSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    RetryWhenSubscriber.prototype.constructor = RetryWhenSubscriber;
    RetryWhenSubscriber.prototype.error = function error (err) {
        if (!this.isStopped) {
            var errors = this.errors;
            var retries = this.retries;
            var retriesSubscription = this.retriesSubscription;
            if (!retries) {
                errors = new Subject();
                retries = tryCatch(this.notifier)(errors);
                if (retries === errorObject) {
                    return OuterSubscriber$$1.prototype.error.call(this, errorObject.e);
                }
                retriesSubscription = subscribeToResult(this, retries);
            }
            else {
                this.errors = null;
                this.retriesSubscription = null;
            }
            this.unsubscribe();
            this.closed = false;
            this.errors = errors;
            this.retries = retries;
            this.retriesSubscription = retriesSubscription;
            errors.next(err);
        }
    };
    RetryWhenSubscriber.prototype._unsubscribe = function _unsubscribe () {
        var ref = this;
        var errors = ref.errors;
        var retriesSubscription = ref.retriesSubscription;
        if (errors) {
            errors.unsubscribe();
            this.errors = null;
        }
        if (retriesSubscription) {
            retriesSubscription.unsubscribe();
            this.retriesSubscription = null;
        }
        this.retries = null;
    };
    RetryWhenSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        var ref = this;
        var errors = ref.errors;
        var retries = ref.retries;
        var retriesSubscription = ref.retriesSubscription;
        this.errors = null;
        this.retries = null;
        this.retriesSubscription = null;
        this.unsubscribe();
        this.isStopped = false;
        this.closed = false;
        this.errors = errors;
        this.retries = retries;
        this.retriesSubscription = retriesSubscription;
        this.source.subscribe(this);
    };

    return RetryWhenSubscriber;
}(OuterSubscriber));

Observable.prototype.retryWhen = retryWhen;

/**
 * Emits the most recently emitted value from the source Observable whenever
 * another Observable, the `notifier`, emits.
 *
 * <span class="informal">It's like {@link sampleTime}, but samples whenever
 * the `notifier` Observable emits something.</span>
 *
 * <img src="./img/sample.png" width="100%">
 *
 * Whenever the `notifier` Observable emits a value or completes, `sample`
 * looks at the source Observable and emits whichever value it has most recently
 * emitted since the previous sampling, unless the source has not emitted
 * anything since the previous sampling. The `notifier` is subscribed to as soon
 * as the output Observable is subscribed.
 *
 * @example <caption>On every click, sample the most recent "seconds" timer</caption>
 * var seconds = Rx.Observable.interval(1000);
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = seconds.sample(clicks);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link audit}
 * @see {@link debounce}
 * @see {@link sampleTime}
 * @see {@link throttle}
 *
 * @param {Observable<any>} notifier The Observable to use for sampling the
 * source Observable.
 * @return {Observable<T>} An Observable that emits the results of sampling the
 * values emitted by the source Observable whenever the notifier Observable
 * emits value or completes.
 * @method sample
 * @owner Observable
 */
function sample(notifier) {
    return this.lift(new SampleOperator(notifier));
}
var SampleOperator = function SampleOperator(notifier) {
    this.notifier = notifier;
};
SampleOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SampleSubscriber(subscriber, this.notifier));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SampleSubscriber = (function (OuterSubscriber$$1) {
    function SampleSubscriber(destination, notifier) {
        OuterSubscriber$$1.call(this, destination);
        this.hasValue = false;
        this.add(subscribeToResult(this, notifier));
    }

    if ( OuterSubscriber$$1 ) SampleSubscriber.__proto__ = OuterSubscriber$$1;
    SampleSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    SampleSubscriber.prototype.constructor = SampleSubscriber;
    SampleSubscriber.prototype._next = function _next (value) {
        this.value = value;
        this.hasValue = true;
    };
    SampleSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.emitValue();
    };
    SampleSubscriber.prototype.notifyComplete = function notifyComplete () {
        this.emitValue();
    };
    SampleSubscriber.prototype.emitValue = function emitValue () {
        if (this.hasValue) {
            this.hasValue = false;
            this.destination.next(this.value);
        }
    };

    return SampleSubscriber;
}(OuterSubscriber));

Observable.prototype.sample = sample;

/**
 * Emits the most recently emitted value from the source Observable within
 * periodic time intervals.
 *
 * <span class="informal">Samples the source Observable at periodic time
 * intervals, emitting what it samples.</span>
 *
 * <img src="./img/sampleTime.png" width="100%">
 *
 * `sampleTime` periodically looks at the source Observable and emits whichever
 * value it has most recently emitted since the previous sampling, unless the
 * source has not emitted anything since the previous sampling. The sampling
 * happens periodically in time every `period` milliseconds (or the time unit
 * defined by the optional `scheduler` argument). The sampling starts as soon as
 * the output Observable is subscribed.
 *
 * @example <caption>Every second, emit the most recent click at most once</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.sampleTime(1000);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link auditTime}
 * @see {@link debounceTime}
 * @see {@link delay}
 * @see {@link sample}
 * @see {@link throttleTime}
 *
 * @param {number} period The sampling period expressed in milliseconds or the
 * time unit determined internally by the optional `scheduler`.
 * @param {Scheduler} [scheduler=async] The {@link Scheduler} to use for
 * managing the timers that handle the sampling.
 * @return {Observable<T>} An Observable that emits the results of sampling the
 * values emitted by the source Observable at the specified time interval.
 * @method sampleTime
 * @owner Observable
 */
function sampleTime(period, scheduler) {
    if ( scheduler === void 0 ) scheduler = async;

    return this.lift(new SampleTimeOperator(period, scheduler));
}
var SampleTimeOperator = function SampleTimeOperator(period, scheduler) {
    this.period = period;
    this.scheduler = scheduler;
};
SampleTimeOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SampleTimeSubscriber(subscriber, this.period, this.scheduler));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SampleTimeSubscriber = (function (Subscriber$$1) {
    function SampleTimeSubscriber(destination, period, scheduler) {
        Subscriber$$1.call(this, destination);
        this.period = period;
        this.scheduler = scheduler;
        this.hasValue = false;
        this.add(scheduler.schedule(dispatchNotification, period, { subscriber: this, period: period }));
    }

    if ( Subscriber$$1 ) SampleTimeSubscriber.__proto__ = Subscriber$$1;
    SampleTimeSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    SampleTimeSubscriber.prototype.constructor = SampleTimeSubscriber;
    SampleTimeSubscriber.prototype._next = function _next (value) {
        this.lastValue = value;
        this.hasValue = true;
    };
    SampleTimeSubscriber.prototype.notifyNext = function notifyNext () {
        if (this.hasValue) {
            this.hasValue = false;
            this.destination.next(this.lastValue);
        }
    };

    return SampleTimeSubscriber;
}(Subscriber));
function dispatchNotification(state) {
    var subscriber = state.subscriber;
    var period = state.period;
    subscriber.notifyNext();
    this.schedule(state, period);
}

Observable.prototype.sampleTime = sampleTime;

/**
 * Applies an accumulator function over the source Observable, and returns each
 * intermediate result, with an optional seed value.
 *
 * <span class="informal">It's like {@link reduce}, but emits the current
 * accumulation whenever the source emits a value.</span>
 *
 * <img src="./img/scan.png" width="100%">
 *
 * Combines together all values emitted on the source, using an accumulator
 * function that knows how to join a new source value into the accumulation from
 * the past. Is similar to {@link reduce}, but emits the intermediate
 * accumulations.
 *
 * Returns an Observable that applies a specified `accumulator` function to each
 * item emitted by the source Observable. If a `seed` value is specified, then
 * that value will be used as the initial value for the accumulator. If no seed
 * value is specified, the first item of the source is used as the seed.
 *
 * @example <caption>Count the number of click events</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var ones = clicks.mapTo(1);
 * var seed = 0;
 * var count = ones.scan((acc, one) => acc + one, seed);
 * count.subscribe(x => console.log(x));
 *
 * @see {@link expand}
 * @see {@link mergeScan}
 * @see {@link reduce}
 *
 * @param {function(acc: R, value: T, index: number): R} accumulator
 * The accumulator function called on each source value.
 * @param {T|R} [seed] The initial accumulation value.
 * @return {Observable<R>} An observable of the accumulated values.
 * @method scan
 * @owner Observable
 */
function scan(accumulator, seed) {
    return this.lift(new ScanOperator(accumulator, seed));
}
var ScanOperator = function ScanOperator(accumulator, seed) {
    this.accumulator = accumulator;
    this.seed = seed;
};
ScanOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new ScanSubscriber(subscriber, this.accumulator, this.seed));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ScanSubscriber = (function (Subscriber$$1) {
    function ScanSubscriber(destination, accumulator, seed) {
        Subscriber$$1.call(this, destination);
        this.accumulator = accumulator;
        this.index = 0;
        this.accumulatorSet = false;
        this.seed = seed;
        this.accumulatorSet = typeof seed !== 'undefined';
    }

    if ( Subscriber$$1 ) ScanSubscriber.__proto__ = Subscriber$$1;
    ScanSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    ScanSubscriber.prototype.constructor = ScanSubscriber;

    var prototypeAccessors = { seed: {} };
    prototypeAccessors.seed.get = function () {
        return this._seed;
    };
    prototypeAccessors.seed.set = function (value) {
        this.accumulatorSet = true;
        this._seed = value;
    };
    ScanSubscriber.prototype._next = function _next (value) {
        if (!this.accumulatorSet) {
            this.seed = value;
            this.destination.next(value);
        }
        else {
            return this._tryNext(value);
        }
    };
    ScanSubscriber.prototype._tryNext = function _tryNext (value) {
        var index = this.index++;
        var result;
        try {
            result = this.accumulator(this.seed, value, index);
        }
        catch (err) {
            this.destination.error(err);
        }
        this.seed = result;
        this.destination.next(result);
    };

    Object.defineProperties( ScanSubscriber.prototype, prototypeAccessors );

    return ScanSubscriber;
}(Subscriber));

Observable.prototype.scan = scan;

/**
 * Compares all values of two observables in sequence using an optional comparor function
 * and returns an observable of a single boolean value representing whether or not the two sequences
 * are equal.
 *
 * <span class="informal">Checks to see of all values emitted by both observables are equal, in order.</span>
 *
 * <img src="./img/sequenceEqual.png" width="100%">
 *
 * `sequenceEqual` subscribes to two observables and buffers incoming values from each observable. Whenever either
 * observable emits a value, the value is buffered and the buffers are shifted and compared from the bottom
 * up; If any value pair doesn't match, the returned observable will emit `false` and complete. If one of the
 * observables completes, the operator will wait for the other observable to complete; If the other
 * observable emits before completing, the returned observable will emit `false` and complete. If one observable never
 * completes or emits after the other complets, the returned observable will never complete.
 *
 * @example <caption>figure out if the Konami code matches</caption>
 * var code = Observable.from([
 *  "ArrowUp",
 *  "ArrowUp",
 *  "ArrowDown",
 *  "ArrowDown",
 *  "ArrowLeft",
 *  "ArrowRight",
 *  "ArrowLeft",
 *  "ArrowRight",
 *  "KeyB",
 *  "KeyA",
 *  "Enter" // no start key, clearly.
 * ]);
 *
 * var keys = Rx.Observable.fromEvent(document, 'keyup')
 *  .map(e => e.code);
 * var matches = keys.bufferCount(11, 1)
 *  .mergeMap(
 *    last11 =>
 *      Rx.Observable.from(last11)
 *        .sequenceEqual(code)
 *   );
 * matches.subscribe(matched => console.log('Successful cheat at Contra? ', matched));
 *
 * @see {@link combineLatest}
 * @see {@link zip}
 * @see {@link withLatestFrom}
 *
 * @param {Observable} compareTo the observable sequence to compare the source sequence to.
 * @param {function} [comparor] An optional function to compare each value pair
 * @return {Observable} An Observable of a single boolean value representing whether or not
 * the values emitted by both observables were equal in sequence
 * @method sequenceEqual
 * @owner Observable
 */
function sequenceEqual(compareTo, comparor) {
    return this.lift(new SequenceEqualOperator(compareTo, comparor));
}
var SequenceEqualOperator = function SequenceEqualOperator(compareTo, comparor) {
    this.compareTo = compareTo;
    this.comparor = comparor;
};
SequenceEqualOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SequenceEqualSubscriber(subscriber, this.compareTo, this.comparor));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SequenceEqualSubscriber = (function (Subscriber$$1) {
    function SequenceEqualSubscriber(destination, compareTo, comparor) {
        Subscriber$$1.call(this, destination);
        this.compareTo = compareTo;
        this.comparor = comparor;
        this._a = [];
        this._b = [];
        this._oneComplete = false;
        this.add(compareTo.subscribe(new SequenceEqualCompareToSubscriber(destination, this)));
    }

    if ( Subscriber$$1 ) SequenceEqualSubscriber.__proto__ = Subscriber$$1;
    SequenceEqualSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    SequenceEqualSubscriber.prototype.constructor = SequenceEqualSubscriber;
    SequenceEqualSubscriber.prototype._next = function _next (value) {
        if (this._oneComplete && this._b.length === 0) {
            this.emit(false);
        }
        else {
            this._a.push(value);
            this.checkValues();
        }
    };
    SequenceEqualSubscriber.prototype._complete = function _complete () {
        if (this._oneComplete) {
            this.emit(this._a.length === 0 && this._b.length === 0);
        }
        else {
            this._oneComplete = true;
        }
    };
    SequenceEqualSubscriber.prototype.checkValues = function checkValues () {
        var this$1 = this;

        var ref = this;
        var _a = ref._a;
        var _b = ref._b;
        var comparor = ref.comparor;
        while (_a.length > 0 && _b.length > 0) {
            var a = _a.shift();
            var b = _b.shift();
            var areEqual = false;
            if (comparor) {
                areEqual = tryCatch(comparor)(a, b);
                if (areEqual === errorObject) {
                    this$1.destination.error(errorObject.e);
                }
            }
            else {
                areEqual = a === b;
            }
            if (!areEqual) {
                this$1.emit(false);
            }
        }
    };
    SequenceEqualSubscriber.prototype.emit = function emit (value) {
        var ref = this;
        var destination = ref.destination;
        destination.next(value);
        destination.complete();
    };
    SequenceEqualSubscriber.prototype.nextB = function nextB (value) {
        if (this._oneComplete && this._a.length === 0) {
            this.emit(false);
        }
        else {
            this._b.push(value);
            this.checkValues();
        }
    };

    return SequenceEqualSubscriber;
}(Subscriber));
var SequenceEqualCompareToSubscriber = (function (Subscriber$$1) {
    function SequenceEqualCompareToSubscriber(destination, parent) {
        Subscriber$$1.call(this, destination);
        this.parent = parent;
    }

    if ( Subscriber$$1 ) SequenceEqualCompareToSubscriber.__proto__ = Subscriber$$1;
    SequenceEqualCompareToSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    SequenceEqualCompareToSubscriber.prototype.constructor = SequenceEqualCompareToSubscriber;
    SequenceEqualCompareToSubscriber.prototype._next = function _next (value) {
        this.parent.nextB(value);
    };
    SequenceEqualCompareToSubscriber.prototype._error = function _error (err) {
        this.parent.error(err);
    };
    SequenceEqualCompareToSubscriber.prototype._complete = function _complete () {
        this.parent._complete();
    };

    return SequenceEqualCompareToSubscriber;
}(Subscriber));

Observable.prototype.sequenceEqual = sequenceEqual;

function shareSubjectFactory() {
    return new Subject();
}
/**
 * Returns a new Observable that multicasts (shares) the original Observable. As long as there is at least one
 * Subscriber this Observable will be subscribed and emitting data. When all subscribers have unsubscribed it will
 * unsubscribe from the source Observable. Because the Observable is multicasting it makes the stream `hot`.
 * This is an alias for .publish().refCount().
 *
 * <img src="./img/share.png" width="100%">
 *
 * @return {Observable<T>} an Observable that upon connection causes the source Observable to emit items to its Observers
 * @method share
 * @owner Observable
 */
function share() {
    return multicast.call(this, shareSubjectFactory).refCount();
}

Observable.prototype.share = share;

/**
 * Returns an Observable that emits the single item emitted by the source Observable that matches a specified
 * predicate, if that Observable emits one such item. If the source Observable emits more than one such item or no
 * such items, notify of an IllegalArgumentException or NoSuchElementException respectively.
 *
 * <img src="./img/single.png" width="100%">
 *
 * @throws {EmptyError} Delivers an EmptyError to the Observer's `error`
 * callback if the Observable completes before any `next` notification was sent.
 * @param {Function} a predicate function to evaluate items emitted by the source Observable.
 * @return {Observable<T>} an Observable that emits the single item emitted by the source Observable that matches
 * the predicate.
 .
 * @method single
 * @owner Observable
 */
function single(predicate) {
    return this.lift(new SingleOperator(predicate, this));
}
var SingleOperator = function SingleOperator(predicate, source) {
    this.predicate = predicate;
    this.source = source;
};
SingleOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SingleSubscriber(subscriber, this.predicate, this.source));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SingleSubscriber = (function (Subscriber$$1) {
    function SingleSubscriber(destination, predicate, source) {
        Subscriber$$1.call(this, destination);
        this.predicate = predicate;
        this.source = source;
        this.seenValue = false;
        this.index = 0;
    }

    if ( Subscriber$$1 ) SingleSubscriber.__proto__ = Subscriber$$1;
    SingleSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    SingleSubscriber.prototype.constructor = SingleSubscriber;
    SingleSubscriber.prototype.applySingleValue = function applySingleValue (value) {
        if (this.seenValue) {
            this.destination.error('Sequence contains more than one element');
        }
        else {
            this.seenValue = true;
            this.singleValue = value;
        }
    };
    SingleSubscriber.prototype._next = function _next (value) {
        var predicate = this.predicate;
        this.index++;
        if (predicate) {
            this.tryNext(value);
        }
        else {
            this.applySingleValue(value);
        }
    };
    SingleSubscriber.prototype.tryNext = function tryNext (value) {
        try {
            var result = this.predicate(value, this.index, this.source);
            if (result) {
                this.applySingleValue(value);
            }
        }
        catch (err) {
            this.destination.error(err);
        }
    };
    SingleSubscriber.prototype._complete = function _complete () {
        var destination = this.destination;
        if (this.index > 0) {
            destination.next(this.seenValue ? this.singleValue : undefined);
            destination.complete();
        }
        else {
            destination.error(new EmptyError);
        }
    };

    return SingleSubscriber;
}(Subscriber));

Observable.prototype.single = single;

/**
 * Returns an Observable that skips `n` items emitted by an Observable.
 *
 * <img src="./img/skip.png" width="100%">
 *
 * @param {Number} the `n` of times, items emitted by source Observable should be skipped.
 * @return {Observable} an Observable that skips values emitted by the source Observable.
 *
 * @method skip
 * @owner Observable
 */
function skip(total) {
    return this.lift(new SkipOperator(total));
}
var SkipOperator = function SkipOperator(total) {
    this.total = total;
};
SkipOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SkipSubscriber(subscriber, this.total));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SkipSubscriber = (function (Subscriber$$1) {
    function SkipSubscriber(destination, total) {
        Subscriber$$1.call(this, destination);
        this.total = total;
        this.count = 0;
    }

    if ( Subscriber$$1 ) SkipSubscriber.__proto__ = Subscriber$$1;
    SkipSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    SkipSubscriber.prototype.constructor = SkipSubscriber;
    SkipSubscriber.prototype._next = function _next (x) {
        if (++this.count > this.total) {
            this.destination.next(x);
        }
    };

    return SkipSubscriber;
}(Subscriber));

Observable.prototype.skip = skip;

/**
 * Returns an Observable that skips items emitted by the source Observable until a second Observable emits an item.
 *
 * <img src="./img/skipUntil.png" width="100%">
 *
 * @param {Observable} the second Observable that has to emit an item before the source Observable's elements begin to
 * be mirrored by the resulting Observable.
 * @return {Observable<T>} an Observable that skips items from the source Observable until the second Observable emits
 * an item, then emits the remaining items.
 * @method skipUntil
 * @owner Observable
 */
function skipUntil(notifier) {
    return this.lift(new SkipUntilOperator(notifier));
}
var SkipUntilOperator = function SkipUntilOperator(notifier) {
    this.notifier = notifier;
};
SkipUntilOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SkipUntilSubscriber(subscriber, this.notifier));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SkipUntilSubscriber = (function (OuterSubscriber$$1) {
    function SkipUntilSubscriber(destination, notifier) {
        OuterSubscriber$$1.call(this, destination);
        this.hasValue = false;
        this.isInnerStopped = false;
        this.add(subscribeToResult(this, notifier));
    }

    if ( OuterSubscriber$$1 ) SkipUntilSubscriber.__proto__ = OuterSubscriber$$1;
    SkipUntilSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    SkipUntilSubscriber.prototype.constructor = SkipUntilSubscriber;
    SkipUntilSubscriber.prototype._next = function _next (value) {
        if (this.hasValue) {
            OuterSubscriber$$1.prototype._next.call(this, value);
        }
    };
    SkipUntilSubscriber.prototype._complete = function _complete () {
        if (this.isInnerStopped) {
            OuterSubscriber$$1.prototype._complete.call(this);
        }
        else {
            this.unsubscribe();
        }
    };
    SkipUntilSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.hasValue = true;
    };
    SkipUntilSubscriber.prototype.notifyComplete = function notifyComplete () {
        this.isInnerStopped = true;
        if (this.isStopped) {
            OuterSubscriber$$1.prototype._complete.call(this);
        }
    };

    return SkipUntilSubscriber;
}(OuterSubscriber));

Observable.prototype.skipUntil = skipUntil;

/**
 * Returns an Observable that skips all items emitted by the source Observable as long as a specified condition holds
 * true, but emits all further source items as soon as the condition becomes false.
 *
 * <img src="./img/skipWhile.png" width="100%">
 *
 * @param {Function} predicate - a function to test each item emitted from the source Observable.
 * @return {Observable<T>} an Observable that begins emitting items emitted by the source Observable when the
 * specified predicate becomes false.
 * @method skipWhile
 * @owner Observable
 */
function skipWhile(predicate) {
    return this.lift(new SkipWhileOperator(predicate));
}
var SkipWhileOperator = function SkipWhileOperator(predicate) {
    this.predicate = predicate;
};
SkipWhileOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SkipWhileSubscriber(subscriber, this.predicate));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SkipWhileSubscriber = (function (Subscriber$$1) {
    function SkipWhileSubscriber(destination, predicate) {
        Subscriber$$1.call(this, destination);
        this.predicate = predicate;
        this.skipping = true;
        this.index = 0;
    }

    if ( Subscriber$$1 ) SkipWhileSubscriber.__proto__ = Subscriber$$1;
    SkipWhileSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    SkipWhileSubscriber.prototype.constructor = SkipWhileSubscriber;
    SkipWhileSubscriber.prototype._next = function _next (value) {
        var destination = this.destination;
        if (this.skipping) {
            this.tryCallPredicate(value);
        }
        if (!this.skipping) {
            destination.next(value);
        }
    };
    SkipWhileSubscriber.prototype.tryCallPredicate = function tryCallPredicate (value) {
        try {
            var result = this.predicate(value, this.index++);
            this.skipping = Boolean(result);
        }
        catch (err) {
            this.destination.error(err);
        }
    };

    return SkipWhileSubscriber;
}(Subscriber));

Observable.prototype.skipWhile = skipWhile;

/**
 * Returns an Observable that emits the items in a specified Iterable before it begins to emit items emitted by the
 * source Observable.
 *
 * <img src="./img/startWith.png" width="100%">
 *
 * @param {Values} an Iterable that contains the items you want the modified Observable to emit first.
 * @return {Observable} an Observable that emits the items in the specified Iterable and then emits the items
 * emitted by the source Observable.
 * @method startWith
 * @owner Observable
 */
function startWith() {
    var array = [], len$1 = arguments.length;
    while ( len$1-- ) array[ len$1 ] = arguments[ len$1 ];

    var scheduler = array[array.length - 1];
    if (isScheduler(scheduler)) {
        array.pop();
    }
    else {
        scheduler = null;
    }
    var len = array.length;
    if (len === 1) {
        return concatStatic(new ScalarObservable(array[0], scheduler), this);
    }
    else if (len > 1) {
        return concatStatic(new ArrayObservable(array, scheduler), this);
    }
    else {
        return concatStatic(new EmptyObservable(scheduler), this);
    }
}

Observable.prototype.startWith = startWith;

/**
Some credit for this helper goes to http://github.com/YuzuJS/setImmediate
*/
var ImmediateDefinition = function ImmediateDefinition(root$$1) {
    this.root = root$$1;
    if (root$$1.setImmediate && typeof root$$1.setImmediate === 'function') {
        this.setImmediate = root$$1.setImmediate.bind(root$$1);
        this.clearImmediate = root$$1.clearImmediate.bind(root$$1);
    }
    else {
        this.nextHandle = 1;
        this.tasksByHandle = {};
        this.currentlyRunningATask = false;
        // Don't get fooled by e.g. browserify environments.
        if (this.canUseProcessNextTick()) {
            // For Node.js before 0.9
            this.setImmediate = this.createProcessNextTickSetImmediate();
        }
        else if (this.canUsePostMessage()) {
            // For non-IE10 modern browsers
            this.setImmediate = this.createPostMessageSetImmediate();
        }
        else if (this.canUseMessageChannel()) {
            // For web workers, where supported
            this.setImmediate = this.createMessageChannelSetImmediate();
        }
        else if (this.canUseReadyStateChange()) {
            // For IE 6–8
            this.setImmediate = this.createReadyStateChangeSetImmediate();
        }
        else {
            // For older browsers
            this.setImmediate = this.createSetTimeoutSetImmediate();
        }
        var ci = function clearImmediate(handle) {
            delete clearImmediate.instance.tasksByHandle[handle];
        };
        ci.instance = this;
        this.clearImmediate = ci;
    }
};
ImmediateDefinition.prototype.identify = function identify (o) {
    return this.root.Object.prototype.toString.call(o);
};
ImmediateDefinition.prototype.canUseProcessNextTick = function canUseProcessNextTick () {
    return this.identify(this.root.process) === '[object process]';
};
ImmediateDefinition.prototype.canUseMessageChannel = function canUseMessageChannel () {
    return Boolean(this.root.MessageChannel);
};
ImmediateDefinition.prototype.canUseReadyStateChange = function canUseReadyStateChange () {
    var document = this.root.document;
    return Boolean(document && 'onreadystatechange' in document.createElement('script'));
};
ImmediateDefinition.prototype.canUsePostMessage = function canUsePostMessage () {
    var root$$1 = this.root;
    // The test against `importScripts` prevents this implementation from being installed inside a web worker,
    // where `root.postMessage` means something completely different and can't be used for this purpose.
    if (root$$1.postMessage && !root$$1.importScripts) {
        var postMessageIsAsynchronous = true;
        var oldOnMessage = root$$1.onmessage;
        root$$1.onmessage = function () {
            postMessageIsAsynchronous = false;
        };
        root$$1.postMessage('', '*');
        root$$1.onmessage = oldOnMessage;
        return postMessageIsAsynchronous;
    }
    return false;
};
// This function accepts the same arguments as setImmediate, but
// returns a function that requires no arguments.
ImmediateDefinition.prototype.partiallyApplied = function partiallyApplied (handler) {
        var args = [], len = arguments.length - 1;
        while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

    var fn = function result() {
        var handler = result.handler;
            var args = result.args;
        if (typeof handler === 'function') {
            handler.apply(undefined, args);
        }
        else {
            (new Function('' + handler))();
        }
    };
    fn.handler = handler;
    fn.args = args;
    return fn;
};
ImmediateDefinition.prototype.addFromSetImmediateArguments = function addFromSetImmediateArguments (args) {
    this.tasksByHandle[this.nextHandle] = this.partiallyApplied.apply(undefined, args);
    return this.nextHandle++;
};
ImmediateDefinition.prototype.createProcessNextTickSetImmediate = function createProcessNextTickSetImmediate () {
    var fn = function setImmediate() {
        var instance = setImmediate.instance;
        var handle = instance.addFromSetImmediateArguments(arguments);
        instance.root.process.nextTick(instance.partiallyApplied(instance.runIfPresent, handle));
        return handle;
    };
    fn.instance = this;
    return fn;
};
ImmediateDefinition.prototype.createPostMessageSetImmediate = function createPostMessageSetImmediate () {
    // Installs an event handler on `global` for the `message` event: see
    // * https://developer.mozilla.org/en/DOM/window.postMessage
    // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages
    var root$$1 = this.root;
    var messagePrefix = 'setImmediate$' + root$$1.Math.random() + '$';
    var onGlobalMessage = function globalMessageHandler(event) {
        var instance = globalMessageHandler.instance;
        if (event.source === root$$1 &&
            typeof event.data === 'string' &&
            event.data.indexOf(messagePrefix) === 0) {
            instance.runIfPresent(+event.data.slice(messagePrefix.length));
        }
    };
    onGlobalMessage.instance = this;
    root$$1.addEventListener('message', onGlobalMessage, false);
    var fn = function setImmediate() {
        var messagePrefix = setImmediate.messagePrefix;
            var instance = setImmediate.instance;
        var handle = instance.addFromSetImmediateArguments(arguments);
        instance.root.postMessage(messagePrefix + handle, '*');
        return handle;
    };
    fn.instance = this;
    fn.messagePrefix = messagePrefix;
    return fn;
};
ImmediateDefinition.prototype.runIfPresent = function runIfPresent (handle) {
    // From the spec: 'Wait until any invocations of this algorithm started before this one have completed.'
    // So if we're currently running a task, we'll need to delay this invocation.
    if (this.currentlyRunningATask) {
        // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
        // 'too much recursion' error.
        this.root.setTimeout(this.partiallyApplied(this.runIfPresent, handle), 0);
    }
    else {
        var task = this.tasksByHandle[handle];
        if (task) {
            this.currentlyRunningATask = true;
            try {
                task();
            }
            finally {
                this.clearImmediate(handle);
                this.currentlyRunningATask = false;
            }
        }
    }
};
ImmediateDefinition.prototype.createMessageChannelSetImmediate = function createMessageChannelSetImmediate () {
        var this$1 = this;

    var channel = new this.root.MessageChannel();
    channel.port1.onmessage = function (event) {
        var handle = event.data;
        this$1.runIfPresent(handle);
    };
    var fn = function setImmediate() {
        var channel = setImmediate.channel;
            var instance = setImmediate.instance;
        var handle = instance.addFromSetImmediateArguments(arguments);
        channel.port2.postMessage(handle);
        return handle;
    };
    fn.channel = channel;
    fn.instance = this;
    return fn;
};
ImmediateDefinition.prototype.createReadyStateChangeSetImmediate = function createReadyStateChangeSetImmediate () {
    var fn = function setImmediate() {
        var instance = setImmediate.instance;
        var root$$1 = instance.root;
        var doc = root$$1.document;
        var html = doc.documentElement;
        var handle = instance.addFromSetImmediateArguments(arguments);
        // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
        // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
        var script = doc.createElement('script');
        script.onreadystatechange = function () {
            instance.runIfPresent(handle);
            script.onreadystatechange = null;
            html.removeChild(script);
            script = null;
        };
        html.appendChild(script);
        return handle;
    };
    fn.instance = this;
    return fn;
};
ImmediateDefinition.prototype.createSetTimeoutSetImmediate = function createSetTimeoutSetImmediate () {
    var fn = function setImmediate() {
        var instance = setImmediate.instance;
        var handle = instance.addFromSetImmediateArguments(arguments);
        instance.root.setTimeout(instance.partiallyApplied(instance.runIfPresent, handle), 0);
        return handle;
    };
    fn.instance = this;
    return fn;
};
var Immediate = new ImmediateDefinition(root);

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var AsapAction = (function (AsyncAction$$1) {
    function AsapAction(scheduler, work) {
        AsyncAction$$1.call(this, scheduler, work);
        this.scheduler = scheduler;
        this.work = work;
    }

    if ( AsyncAction$$1 ) AsapAction.__proto__ = AsyncAction$$1;
    AsapAction.prototype = Object.create( AsyncAction$$1 && AsyncAction$$1.prototype );
    AsapAction.prototype.constructor = AsapAction;
    AsapAction.prototype.requestAsyncId = function requestAsyncId (scheduler, id, delay) {
        if ( delay === void 0 ) delay = 0;

        // If delay is greater than 0, request as an async action.
        if (delay !== null && delay > 0) {
            return AsyncAction$$1.prototype.requestAsyncId.call(this, scheduler, id, delay);
        }
        // Push the action to the end of the scheduler queue.
        scheduler.actions.push(this);
        // If a microtask has already been scheduled, don't schedule another
        // one. If a microtask hasn't been scheduled yet, schedule one now. Return
        // the current scheduled microtask id.
        return scheduler.scheduled || (scheduler.scheduled = Immediate.setImmediate(scheduler.flush.bind(scheduler, null)));
    };
    AsapAction.prototype.recycleAsyncId = function recycleAsyncId (scheduler, id, delay) {
        if ( delay === void 0 ) delay = 0;

        // If delay exists and is greater than 0, recycle as an async action.
        if (delay !== null && delay > 0) {
            return AsyncAction$$1.prototype.recycleAsyncId.call(this, scheduler, id, delay);
        }
        // If the scheduler queue is empty, cancel the requested microtask and
        // set the scheduled flag to undefined so the next AsapAction will schedule
        // its own.
        if (scheduler.actions.length === 0) {
            Immediate.clearImmediate(id);
            scheduler.scheduled = undefined;
        }
        // Return undefined so the action knows to request a new async id if it's rescheduled.
        return undefined;
    };

    return AsapAction;
}(AsyncAction));

var AsapScheduler = (function (AsyncScheduler$$1) {
    function AsapScheduler () {
        AsyncScheduler$$1.apply(this, arguments);
    }

    if ( AsyncScheduler$$1 ) AsapScheduler.__proto__ = AsyncScheduler$$1;
    AsapScheduler.prototype = Object.create( AsyncScheduler$$1 && AsyncScheduler$$1.prototype );
    AsapScheduler.prototype.constructor = AsapScheduler;

    AsapScheduler.prototype.flush = function flush () {
        this.active = true;
        this.scheduled = undefined;
        var ref = this;
        var actions = ref.actions;
        var error;
        var index = -1;
        var count = actions.length;
        var action = actions.shift();
        do {
            if (error = action.execute(action.state, action.delay)) {
                break;
            }
        } while (++index < count && (action = actions.shift()));
        this.active = false;
        if (error) {
            while (++index < count && (action = actions.shift())) {
                action.unsubscribe();
            }
            throw error;
        }
    };

    return AsapScheduler;
}(AsyncScheduler));

var asap = new AsapScheduler(AsapAction);

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @extends {Ignored}
 * @hide true
 */
var SubscribeOnObservable = (function (Observable$$1) {
    function SubscribeOnObservable(source, delayTime, scheduler) {
        if ( delayTime === void 0 ) delayTime = 0;
        if ( scheduler === void 0 ) scheduler = asap;

        Observable$$1.call(this);
        this.source = source;
        this.delayTime = delayTime;
        this.scheduler = scheduler;
        if (!isNumeric(delayTime) || delayTime < 0) {
            this.delayTime = 0;
        }
        if (!scheduler || typeof scheduler.schedule !== 'function') {
            this.scheduler = asap;
        }
    }

    if ( Observable$$1 ) SubscribeOnObservable.__proto__ = Observable$$1;
    SubscribeOnObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    SubscribeOnObservable.prototype.constructor = SubscribeOnObservable;
    SubscribeOnObservable.create = function create (source, delay, scheduler) {
        if ( delay === void 0 ) delay = 0;
        if ( scheduler === void 0 ) scheduler = asap;

        return new SubscribeOnObservable(source, delay, scheduler);
    };
    SubscribeOnObservable.dispatch = function dispatch (arg) {
        var source = arg.source;
        var subscriber = arg.subscriber;
        return source.subscribe(subscriber);
    };
    SubscribeOnObservable.prototype._subscribe = function _subscribe (subscriber) {
        var delay = this.delayTime;
        var source = this.source;
        var scheduler = this.scheduler;
        return scheduler.schedule(SubscribeOnObservable.dispatch, delay, {
            source: source, subscriber: subscriber
        });
    };

    return SubscribeOnObservable;
}(Observable));

/**
 * Asynchronously subscribes Observers to this Observable on the specified Scheduler.
 *
 * <img src="./img/subscribeOn.png" width="100%">
 *
 * @param {Scheduler} the Scheduler to perform subscription actions on.
 * @return {Observable<T>} the source Observable modified so that its subscriptions happen on the specified Scheduler
 .
 * @method subscribeOn
 * @owner Observable
 */
function subscribeOn(scheduler, delay) {
    if ( delay === void 0 ) delay = 0;

    return new SubscribeOnObservable(this, delay, scheduler);
}

Observable.prototype.subscribeOn = subscribeOn;

/**
 * Converts a higher-order Observable into a first-order Observable by
 * subscribing to only the most recently emitted of those inner Observables.
 *
 * <span class="informal">Flattens an Observable-of-Observables by dropping the
 * previous inner Observable once a new one appears.</span>
 *
 * <img src="./img/switch.png" width="100%">
 *
 * `switch` subscribes to an Observable that emits Observables, also known as a
 * higher-order Observable. Each time it observes one of these emitted inner
 * Observables, the output Observable subscribes to the inner Observable and
 * begins emitting the items emitted by that. So far, it behaves
 * like {@link mergeAll}. However, when a new inner Observable is emitted,
 * `switch` unsubscribes from the earlier-emitted inner Observable and
 * subscribes to the new inner Observable and begins emitting items from it. It
 * continues to behave like this for subsequent inner Observables.
 *
 * @example <caption>Rerun an interval Observable on every click event</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * // Each click event is mapped to an Observable that ticks every second
 * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000));
 * var switched = higherOrder.switch();
 * // The outcome is that `switched` is essentially a timer that restarts
 * // on every click. The interval Observables from older clicks do not merge
 * // with the current interval Observable.
 * switched.subscribe(x => console.log(x));
 *
 * @see {@link combineAll}
 * @see {@link concatAll}
 * @see {@link exhaust}
 * @see {@link mergeAll}
 * @see {@link switchMap}
 * @see {@link switchMapTo}
 * @see {@link zipAll}
 *
 * @return {Observable<T>} An Observable that emits the items emitted by the
 * Observable most recently emitted by the source Observable.
 * @method switch
 * @name switch
 * @owner Observable
 */
function _switch() {
    return this.lift(new SwitchOperator());
}
var SwitchOperator = function SwitchOperator () {};

SwitchOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SwitchSubscriber(subscriber));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SwitchSubscriber = (function (OuterSubscriber$$1) {
    function SwitchSubscriber(destination) {
        OuterSubscriber$$1.call(this, destination);
        this.active = 0;
        this.hasCompleted = false;
    }

    if ( OuterSubscriber$$1 ) SwitchSubscriber.__proto__ = OuterSubscriber$$1;
    SwitchSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    SwitchSubscriber.prototype.constructor = SwitchSubscriber;
    SwitchSubscriber.prototype._next = function _next (value) {
        this.unsubscribeInner();
        this.active++;
        this.add(this.innerSubscription = subscribeToResult(this, value));
    };
    SwitchSubscriber.prototype._complete = function _complete () {
        this.hasCompleted = true;
        if (this.active === 0) {
            this.destination.complete();
        }
    };
    SwitchSubscriber.prototype.unsubscribeInner = function unsubscribeInner () {
        this.active = this.active > 0 ? this.active - 1 : 0;
        var innerSubscription = this.innerSubscription;
        if (innerSubscription) {
            innerSubscription.unsubscribe();
            this.remove(innerSubscription);
        }
    };
    SwitchSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.destination.next(innerValue);
    };
    SwitchSubscriber.prototype.notifyError = function notifyError (err) {
        this.destination.error(err);
    };
    SwitchSubscriber.prototype.notifyComplete = function notifyComplete () {
        this.unsubscribeInner();
        if (this.hasCompleted && this.active === 0) {
            this.destination.complete();
        }
    };

    return SwitchSubscriber;
}(OuterSubscriber));

Observable.prototype.switch = _switch;
Observable.prototype._switch = _switch;

/**
 * Projects each source value to an Observable which is merged in the output
 * Observable, emitting values only from the most recently projected Observable.
 *
 * <span class="informal">Maps each value to an Observable, then flattens all of
 * these inner Observables using {@link switch}.</span>
 *
 * <img src="./img/switchMap.png" width="100%">
 *
 * Returns an Observable that emits items based on applying a function that you
 * supply to each item emitted by the source Observable, where that function
 * returns an (so-called "inner") Observable. Each time it observes one of these
 * inner Observables, the output Observable begins emitting the items emitted by
 * that inner Observable. When a new inner Observable is emitted, `switchMap`
 * stops emitting items from the earlier-emitted inner Observable and begins
 * emitting items from the new one. It continues to behave like this for
 * subsequent inner Observables.
 *
 * @example <caption>Rerun an interval Observable on every click event</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.switchMap((ev) => Rx.Observable.interval(1000));
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concatMap}
 * @see {@link exhaustMap}
 * @see {@link mergeMap}
 * @see {@link switch}
 * @see {@link switchMapTo}
 *
 * @param {function(value: T, ?index: number): Observable} project A function
 * that, when applied to an item emitted by the source Observable, returns an
 * Observable.
 * @param {function(outerValue: T, innerValue: I, outerIndex: number, innerIndex: number): any} [resultSelector]
 * A function to produce the value on the output Observable based on the values
 * and the indices of the source (outer) emission and the inner Observable
 * emission. The arguments passed to this function are:
 * - `outerValue`: the value that came from the source
 * - `innerValue`: the value that came from the projected Observable
 * - `outerIndex`: the "index" of the value that came from the source
 * - `innerIndex`: the "index" of the value from the projected Observable
 * @return {Observable} An Observable that emits the result of applying the
 * projection function (and the optional `resultSelector`) to each item emitted
 * by the source Observable and taking only the values from the most recently
 * projected inner Observable.
 * @method switchMap
 * @owner Observable
 */
function switchMap(project, resultSelector) {
    return this.lift(new SwitchMapOperator(project, resultSelector));
}
var SwitchMapOperator = function SwitchMapOperator(project, resultSelector) {
    this.project = project;
    this.resultSelector = resultSelector;
};
SwitchMapOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SwitchMapSubscriber(subscriber, this.project, this.resultSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SwitchMapSubscriber = (function (OuterSubscriber$$1) {
    function SwitchMapSubscriber(destination, project, resultSelector) {
        OuterSubscriber$$1.call(this, destination);
        this.project = project;
        this.resultSelector = resultSelector;
        this.index = 0;
    }

    if ( OuterSubscriber$$1 ) SwitchMapSubscriber.__proto__ = OuterSubscriber$$1;
    SwitchMapSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    SwitchMapSubscriber.prototype.constructor = SwitchMapSubscriber;
    SwitchMapSubscriber.prototype._next = function _next (value) {
        var result;
        var index = this.index++;
        try {
            result = this.project(value, index);
        }
        catch (error) {
            this.destination.error(error);
            return;
        }
        this._innerSub(result, value, index);
    };
    SwitchMapSubscriber.prototype._innerSub = function _innerSub (result, value, index) {
        var innerSubscription = this.innerSubscription;
        if (innerSubscription) {
            innerSubscription.unsubscribe();
        }
        this.add(this.innerSubscription = subscribeToResult(this, result, value, index));
    };
    SwitchMapSubscriber.prototype._complete = function _complete () {
        var ref = this;
        var innerSubscription = ref.innerSubscription;
        if (!innerSubscription || innerSubscription.closed) {
            OuterSubscriber$$1.prototype._complete.call(this);
        }
    };
    SwitchMapSubscriber.prototype._unsubscribe = function _unsubscribe () {
        this.innerSubscription = null;
    };
    SwitchMapSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        this.remove(innerSub);
        this.innerSubscription = null;
        if (this.isStopped) {
            OuterSubscriber$$1.prototype._complete.call(this);
        }
    };
    SwitchMapSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        if (this.resultSelector) {
            this._tryNotifyNext(outerValue, innerValue, outerIndex, innerIndex);
        }
        else {
            this.destination.next(innerValue);
        }
    };
    SwitchMapSubscriber.prototype._tryNotifyNext = function _tryNotifyNext (outerValue, innerValue, outerIndex, innerIndex) {
        var result;
        try {
            result = this.resultSelector(outerValue, innerValue, outerIndex, innerIndex);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.destination.next(result);
    };

    return SwitchMapSubscriber;
}(OuterSubscriber));

Observable.prototype.switchMap = switchMap;

/**
 * Projects each source value to the same Observable which is flattened multiple
 * times with {@link switch} in the output Observable.
 *
 * <span class="informal">It's like {@link switchMap}, but maps each value
 * always to the same inner Observable.</span>
 *
 * <img src="./img/switchMapTo.png" width="100%">
 *
 * Maps each source value to the given Observable `innerObservable` regardless
 * of the source value, and then flattens those resulting Observables into one
 * single Observable, which is the output Observable. The output Observables
 * emits values only from the most recently emitted instance of
 * `innerObservable`.
 *
 * @example <caption>Rerun an interval Observable on every click event</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.switchMapTo(Rx.Observable.interval(1000));
 * result.subscribe(x => console.log(x));
 *
 * @see {@link concatMapTo}
 * @see {@link switch}
 * @see {@link switchMap}
 * @see {@link mergeMapTo}
 *
 * @param {Observable} innerObservable An Observable to replace each value from
 * the source Observable.
 * @param {function(outerValue: T, innerValue: I, outerIndex: number, innerIndex: number): any} [resultSelector]
 * A function to produce the value on the output Observable based on the values
 * and the indices of the source (outer) emission and the inner Observable
 * emission. The arguments passed to this function are:
 * - `outerValue`: the value that came from the source
 * - `innerValue`: the value that came from the projected Observable
 * - `outerIndex`: the "index" of the value that came from the source
 * - `innerIndex`: the "index" of the value from the projected Observable
 * @return {Observable} An Observable that emits items from the given
 * `innerObservable` every time a value is emitted on the source Observable.
 * @return {Observable} An Observable that emits items from the given
 * `innerObservable` (and optionally transformed through `resultSelector`) every
 * time a value is emitted on the source Observable, and taking only the values
 * from the most recently projected inner Observable.
 * @method switchMapTo
 * @owner Observable
 */
function switchMapTo(innerObservable, resultSelector) {
    return this.lift(new SwitchMapToOperator(innerObservable, resultSelector));
}
var SwitchMapToOperator = function SwitchMapToOperator(observable, resultSelector) {
    this.observable = observable;
    this.resultSelector = resultSelector;
};
SwitchMapToOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new SwitchMapToSubscriber(subscriber, this.observable, this.resultSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var SwitchMapToSubscriber = (function (OuterSubscriber$$1) {
    function SwitchMapToSubscriber(destination, inner, resultSelector) {
        OuterSubscriber$$1.call(this, destination);
        this.inner = inner;
        this.resultSelector = resultSelector;
        this.index = 0;
    }

    if ( OuterSubscriber$$1 ) SwitchMapToSubscriber.__proto__ = OuterSubscriber$$1;
    SwitchMapToSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    SwitchMapToSubscriber.prototype.constructor = SwitchMapToSubscriber;
    SwitchMapToSubscriber.prototype._next = function _next (value) {
        var innerSubscription = this.innerSubscription;
        if (innerSubscription) {
            innerSubscription.unsubscribe();
        }
        this.add(this.innerSubscription = subscribeToResult(this, this.inner, value, this.index++));
    };
    SwitchMapToSubscriber.prototype._complete = function _complete () {
        var ref = this;
        var innerSubscription = ref.innerSubscription;
        if (!innerSubscription || innerSubscription.closed) {
            OuterSubscriber$$1.prototype._complete.call(this);
        }
    };
    SwitchMapToSubscriber.prototype._unsubscribe = function _unsubscribe () {
        this.innerSubscription = null;
    };
    SwitchMapToSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        this.remove(innerSub);
        this.innerSubscription = null;
        if (this.isStopped) {
            OuterSubscriber$$1.prototype._complete.call(this);
        }
    };
    SwitchMapToSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        var ref = this;
        var resultSelector = ref.resultSelector;
        var destination = ref.destination;
        if (resultSelector) {
            this.tryResultSelector(outerValue, innerValue, outerIndex, innerIndex);
        }
        else {
            destination.next(innerValue);
        }
    };
    SwitchMapToSubscriber.prototype.tryResultSelector = function tryResultSelector (outerValue, innerValue, outerIndex, innerIndex) {
        var ref = this;
        var resultSelector = ref.resultSelector;
        var destination = ref.destination;
        var result;
        try {
            result = resultSelector(outerValue, innerValue, outerIndex, innerIndex);
        }
        catch (err) {
            destination.error(err);
            return;
        }
        destination.next(result);
    };

    return SwitchMapToSubscriber;
}(OuterSubscriber));

Observable.prototype.switchMapTo = switchMapTo;

/**
 * Emits only the first `count` values emitted by the source Observable.
 *
 * <span class="informal">Takes the first `count` values from the source, then
 * completes.</span>
 *
 * <img src="./img/take.png" width="100%">
 *
 * `take` returns an Observable that emits only the first `count` values emitted
 * by the source Observable. If the source emits fewer than `count` values then
 * all of its values are emitted. After that, it completes, regardless if the
 * source completes.
 *
 * @example <caption>Take the first 5 seconds of an infinite 1-second interval Observable</caption>
 * var interval = Rx.Observable.interval(1000);
 * var five = interval.take(5);
 * five.subscribe(x => console.log(x));
 *
 * @see {@link takeLast}
 * @see {@link takeUntil}
 * @see {@link takeWhile}
 * @see {@link skip}
 *
 * @throws {ArgumentOutOfRangeError} When using `take(i)`, it delivers an
 * ArgumentOutOrRangeError to the Observer's `error` callback if `i < 0`.
 *
 * @param {number} count The maximum number of `next` values to emit.
 * @return {Observable<T>} An Observable that emits only the first `count`
 * values emitted by the source Observable, or all of the values from the source
 * if the source emits fewer than `count` values.
 * @method take
 * @owner Observable
 */
function take(count) {
    if (count === 0) {
        return new EmptyObservable();
    }
    else {
        return this.lift(new TakeOperator(count));
    }
}
var TakeOperator = function TakeOperator(total) {
    this.total = total;
    if (this.total < 0) {
        throw new ArgumentOutOfRangeError;
    }
};
TakeOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new TakeSubscriber(subscriber, this.total));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var TakeSubscriber = (function (Subscriber$$1) {
    function TakeSubscriber(destination, total) {
        Subscriber$$1.call(this, destination);
        this.total = total;
        this.count = 0;
    }

    if ( Subscriber$$1 ) TakeSubscriber.__proto__ = Subscriber$$1;
    TakeSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    TakeSubscriber.prototype.constructor = TakeSubscriber;
    TakeSubscriber.prototype._next = function _next (value) {
        var total = this.total;
        if (++this.count <= total) {
            this.destination.next(value);
            if (this.count === total) {
                this.destination.complete();
                this.unsubscribe();
            }
        }
    };

    return TakeSubscriber;
}(Subscriber));

Observable.prototype.take = take;

/**
 * Emits only the last `count` values emitted by the source Observable.
 *
 * <span class="informal">Remembers the latest `count` values, then emits those
 * only when the source completes.</span>
 *
 * <img src="./img/takeLast.png" width="100%">
 *
 * `takeLast` returns an Observable that emits at most the last `count` values
 * emitted by the source Observable. If the source emits fewer than `count`
 * values then all of its values are emitted. This operator must wait until the
 * `complete` notification emission from the source in order to emit the `next`
 * values on the output Observable, because otherwise it is impossible to know
 * whether or not more values will be emitted on the source. For this reason,
 * all values are emitted synchronously, followed by the complete notification.
 *
 * @example <caption>Take the last 3 values of an Observable with many values</caption>
 * var many = Rx.Observable.range(1, 100);
 * var lastThree = many.takeLast(3);
 * lastThree.subscribe(x => console.log(x));
 *
 * @see {@link take}
 * @see {@link takeUntil}
 * @see {@link takeWhile}
 * @see {@link skip}
 *
 * @throws {ArgumentOutOfRangeError} When using `takeLast(i)`, it delivers an
 * ArgumentOutOrRangeError to the Observer's `error` callback if `i < 0`.
 *
 * @param {number} count The maximum number of values to emit from the end of
 * the sequence of values emitted by the source Observable.
 * @return {Observable<T>} An Observable that emits at most the last count
 * values emitted by the source Observable.
 * @method takeLast
 * @owner Observable
 */
function takeLast(count) {
    if (count === 0) {
        return new EmptyObservable();
    }
    else {
        return this.lift(new TakeLastOperator(count));
    }
}
var TakeLastOperator = function TakeLastOperator(total) {
    this.total = total;
    if (this.total < 0) {
        throw new ArgumentOutOfRangeError;
    }
};
TakeLastOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new TakeLastSubscriber(subscriber, this.total));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var TakeLastSubscriber = (function (Subscriber$$1) {
    function TakeLastSubscriber(destination, total) {
        Subscriber$$1.call(this, destination);
        this.total = total;
        this.ring = new Array();
        this.count = 0;
    }

    if ( Subscriber$$1 ) TakeLastSubscriber.__proto__ = Subscriber$$1;
    TakeLastSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    TakeLastSubscriber.prototype.constructor = TakeLastSubscriber;
    TakeLastSubscriber.prototype._next = function _next (value) {
        var ring = this.ring;
        var total = this.total;
        var count = this.count++;
        if (ring.length < total) {
            ring.push(value);
        }
        else {
            var index = count % total;
            ring[index] = value;
        }
    };
    TakeLastSubscriber.prototype._complete = function _complete () {
        var destination = this.destination;
        var count = this.count;
        if (count > 0) {
            var total = this.count >= this.total ? this.total : this.count;
            var ring = this.ring;
            for (var i = 0; i < total; i++) {
                var idx = (count++) % total;
                destination.next(ring[idx]);
            }
        }
        destination.complete();
    };

    return TakeLastSubscriber;
}(Subscriber));

Observable.prototype.takeLast = takeLast;

/**
 * Emits the values emitted by the source Observable until a `notifier`
 * Observable emits a value.
 *
 * <span class="informal">Lets values pass until a second Observable,
 * `notifier`, emits something. Then, it completes.</span>
 *
 * <img src="./img/takeUntil.png" width="100%">
 *
 * `takeUntil` subscribes and begins mirroring the source Observable. It also
 * monitors a second Observable, `notifier` that you provide. If the `notifier`
 * emits a value or a complete notification, the output Observable stops
 * mirroring the source Observable and completes.
 *
 * @example <caption>Tick every second until the first click happens</caption>
 * var interval = Rx.Observable.interval(1000);
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = interval.takeUntil(clicks);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link take}
 * @see {@link takeLast}
 * @see {@link takeWhile}
 * @see {@link skip}
 *
 * @param {Observable} notifier The Observable whose first emitted value will
 * cause the output Observable of `takeUntil` to stop emitting values from the
 * source Observable.
 * @return {Observable<T>} An Observable that emits the values from the source
 * Observable until such time as `notifier` emits its first value.
 * @method takeUntil
 * @owner Observable
 */
function takeUntil(notifier) {
    return this.lift(new TakeUntilOperator(notifier));
}
var TakeUntilOperator = function TakeUntilOperator(notifier) {
    this.notifier = notifier;
};
TakeUntilOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new TakeUntilSubscriber(subscriber, this.notifier));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var TakeUntilSubscriber = (function (OuterSubscriber$$1) {
    function TakeUntilSubscriber(destination, notifier) {
        OuterSubscriber$$1.call(this, destination);
        this.notifier = notifier;
        this.add(subscribeToResult(this, notifier));
    }

    if ( OuterSubscriber$$1 ) TakeUntilSubscriber.__proto__ = OuterSubscriber$$1;
    TakeUntilSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    TakeUntilSubscriber.prototype.constructor = TakeUntilSubscriber;
    TakeUntilSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.complete();
    };
    TakeUntilSubscriber.prototype.notifyComplete = function notifyComplete () {
        // noop
    };

    return TakeUntilSubscriber;
}(OuterSubscriber));

Observable.prototype.takeUntil = takeUntil;

/**
 * Emits values emitted by the source Observable so long as each value satisfies
 * the given `predicate`, and then completes as soon as this `predicate` is not
 * satisfied.
 *
 * <span class="informal">Takes values from the source only while they pass the
 * condition given. When the first value does not satisfy, it completes.</span>
 *
 * <img src="./img/takeWhile.png" width="100%">
 *
 * `takeWhile` subscribes and begins mirroring the source Observable. Each value
 * emitted on the source is given to the `predicate` function which returns a
 * boolean, representing a condition to be satisfied by the source values. The
 * output Observable emits the source values until such time as the `predicate`
 * returns false, at which point `takeWhile` stops mirroring the source
 * Observable and completes the output Observable.
 *
 * @example <caption>Emit click events only while the clientX property is greater than 200</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.takeWhile(ev => ev.clientX > 200);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link take}
 * @see {@link takeLast}
 * @see {@link takeUntil}
 * @see {@link skip}
 *
 * @param {function(value: T, index: number): boolean} predicate A function that
 * evaluates a value emitted by the source Observable and returns a boolean.
 * Also takes the (zero-based) index as the second argument.
 * @return {Observable<T>} An Observable that emits the values from the source
 * Observable so long as each value satisfies the condition defined by the
 * `predicate`, then completes.
 * @method takeWhile
 * @owner Observable
 */
function takeWhile(predicate) {
    return this.lift(new TakeWhileOperator(predicate));
}
var TakeWhileOperator = function TakeWhileOperator(predicate) {
    this.predicate = predicate;
};
TakeWhileOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new TakeWhileSubscriber(subscriber, this.predicate));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var TakeWhileSubscriber = (function (Subscriber$$1) {
    function TakeWhileSubscriber(destination, predicate) {
        Subscriber$$1.call(this, destination);
        this.predicate = predicate;
        this.index = 0;
    }

    if ( Subscriber$$1 ) TakeWhileSubscriber.__proto__ = Subscriber$$1;
    TakeWhileSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    TakeWhileSubscriber.prototype.constructor = TakeWhileSubscriber;
    TakeWhileSubscriber.prototype._next = function _next (value) {
        var destination = this.destination;
        var result;
        try {
            result = this.predicate(value, this.index++);
        }
        catch (err) {
            destination.error(err);
            return;
        }
        this.nextOrComplete(value, result);
    };
    TakeWhileSubscriber.prototype.nextOrComplete = function nextOrComplete (value, predicateResult) {
        var destination = this.destination;
        if (Boolean(predicateResult)) {
            destination.next(value);
        }
        else {
            destination.complete();
        }
    };

    return TakeWhileSubscriber;
}(Subscriber));

Observable.prototype.takeWhile = takeWhile;

/**
 * Emits a value from the source Observable, then ignores subsequent source
 * values for a duration determined by another Observable, then repeats this
 * process.
 *
 * <span class="informal">It's like {@link throttleTime}, but the silencing
 * duration is determined by a second Observable.</span>
 *
 * <img src="./img/throttle.png" width="100%">
 *
 * `throttle` emits the source Observable values on the output Observable
 * when its internal timer is disabled, and ignores source values when the timer
 * is enabled. Initially, the timer is disabled. As soon as the first source
 * value arrives, it is forwarded to the output Observable, and then the timer
 * is enabled by calling the `durationSelector` function with the source value,
 * which returns the "duration" Observable. When the duration Observable emits a
 * value or completes, the timer is disabled, and this process repeats for the
 * next source value.
 *
 * @example <caption>Emit clicks at a rate of at most one click per second</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.throttle(ev => Rx.Observable.interval(1000));
 * result.subscribe(x => console.log(x));
 *
 * @see {@link audit}
 * @see {@link debounce}
 * @see {@link delayWhen}
 * @see {@link sample}
 * @see {@link throttleTime}
 *
 * @param {function(value: T): Observable|Promise} durationSelector A function
 * that receives a value from the source Observable, for computing the silencing
 * duration for each source value, returned as an Observable or a Promise.
 * @return {Observable<T>} An Observable that performs the throttle operation to
 * limit the rate of emissions from the source.
 * @method throttle
 * @owner Observable
 */
function throttle(durationSelector) {
    return this.lift(new ThrottleOperator(durationSelector));
}
var ThrottleOperator = function ThrottleOperator(durationSelector) {
    this.durationSelector = durationSelector;
};
ThrottleOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new ThrottleSubscriber(subscriber, this.durationSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ThrottleSubscriber = (function (OuterSubscriber$$1) {
    function ThrottleSubscriber(destination, durationSelector) {
        OuterSubscriber$$1.call(this, destination);
        this.destination = destination;
        this.durationSelector = durationSelector;
    }

    if ( OuterSubscriber$$1 ) ThrottleSubscriber.__proto__ = OuterSubscriber$$1;
    ThrottleSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    ThrottleSubscriber.prototype.constructor = ThrottleSubscriber;
    ThrottleSubscriber.prototype._next = function _next (value) {
        if (!this.throttled) {
            this.tryDurationSelector(value);
        }
    };
    ThrottleSubscriber.prototype.tryDurationSelector = function tryDurationSelector (value) {
        var duration = null;
        try {
            duration = this.durationSelector(value);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.emitAndThrottle(value, duration);
    };
    ThrottleSubscriber.prototype.emitAndThrottle = function emitAndThrottle (value, duration) {
        this.add(this.throttled = subscribeToResult(this, duration));
        this.destination.next(value);
    };
    ThrottleSubscriber.prototype._unsubscribe = function _unsubscribe () {
        var throttled = this.throttled;
        if (throttled) {
            this.remove(throttled);
            this.throttled = null;
            throttled.unsubscribe();
        }
    };
    ThrottleSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this._unsubscribe();
    };
    ThrottleSubscriber.prototype.notifyComplete = function notifyComplete () {
        this._unsubscribe();
    };

    return ThrottleSubscriber;
}(OuterSubscriber));

Observable.prototype.throttle = throttle;

/**
 * Emits a value from the source Observable, then ignores subsequent source
 * values for `duration` milliseconds, then repeats this process.
 *
 * <span class="informal">Lets a value pass, then ignores source values for the
 * next `duration` milliseconds.</span>
 *
 * <img src="./img/throttleTime.png" width="100%">
 *
 * `throttleTime` emits the source Observable values on the output Observable
 * when its internal timer is disabled, and ignores source values when the timer
 * is enabled. Initially, the timer is disabled. As soon as the first source
 * value arrives, it is forwarded to the output Observable, and then the timer
 * is enabled. After `duration` milliseconds (or the time unit determined
 * internally by the optional `scheduler`) has passed, the timer is disabled,
 * and this process repeats for the next source value. Optionally takes a
 * {@link Scheduler} for managing timers.
 *
 * @example <caption>Emit clicks at a rate of at most one click per second</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.throttleTime(1000);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link auditTime}
 * @see {@link debounceTime}
 * @see {@link delay}
 * @see {@link sampleTime}
 * @see {@link throttle}
 *
 * @param {number} duration Time to wait before emitting another value after
 * emitting the last value, measured in milliseconds or the time unit determined
 * internally by the optional `scheduler`.
 * @param {Scheduler} [scheduler=async] The {@link Scheduler} to use for
 * managing the timers that handle the sampling.
 * @return {Observable<T>} An Observable that performs the throttle operation to
 * limit the rate of emissions from the source.
 * @method throttleTime
 * @owner Observable
 */
function throttleTime(duration, scheduler) {
    if ( scheduler === void 0 ) scheduler = async;

    return this.lift(new ThrottleTimeOperator(duration, scheduler));
}
var ThrottleTimeOperator = function ThrottleTimeOperator(duration, scheduler) {
    this.duration = duration;
    this.scheduler = scheduler;
};
ThrottleTimeOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new ThrottleTimeSubscriber(subscriber, this.duration, this.scheduler));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ThrottleTimeSubscriber = (function (Subscriber$$1) {
    function ThrottleTimeSubscriber(destination, duration, scheduler) {
        Subscriber$$1.call(this, destination);
        this.duration = duration;
        this.scheduler = scheduler;
    }

    if ( Subscriber$$1 ) ThrottleTimeSubscriber.__proto__ = Subscriber$$1;
    ThrottleTimeSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    ThrottleTimeSubscriber.prototype.constructor = ThrottleTimeSubscriber;
    ThrottleTimeSubscriber.prototype._next = function _next (value) {
        if (!this.throttled) {
            this.add(this.throttled = this.scheduler.schedule(dispatchNext$5, this.duration, { subscriber: this }));
            this.destination.next(value);
        }
    };
    ThrottleTimeSubscriber.prototype.clearThrottle = function clearThrottle () {
        var throttled = this.throttled;
        if (throttled) {
            throttled.unsubscribe();
            this.remove(throttled);
            this.throttled = null;
        }
    };

    return ThrottleTimeSubscriber;
}(Subscriber));
function dispatchNext$5(arg) {
    var subscriber = arg.subscriber;
    subscriber.clearThrottle();
}

Observable.prototype.throttleTime = throttleTime;

/**
 * @param scheduler
 * @return {Observable<TimeInterval<any>>|WebSocketSubject<T>|Observable<T>}
 * @method timeInterval
 * @owner Observable
 */
function timeInterval(scheduler) {
    if ( scheduler === void 0 ) scheduler = async;

    return this.lift(new TimeIntervalOperator(scheduler));
}
var TimeInterval = function TimeInterval(value, interval) {
    this.value = value;
    this.interval = interval;
};

var TimeIntervalOperator = function TimeIntervalOperator(scheduler) {
    this.scheduler = scheduler;
};
TimeIntervalOperator.prototype.call = function call (observer, source) {
    return source._subscribe(new TimeIntervalSubscriber(observer, this.scheduler));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var TimeIntervalSubscriber = (function (Subscriber$$1) {
    function TimeIntervalSubscriber(destination, scheduler) {
        Subscriber$$1.call(this, destination);
        this.scheduler = scheduler;
        this.lastTime = 0;
        this.lastTime = scheduler.now();
    }

    if ( Subscriber$$1 ) TimeIntervalSubscriber.__proto__ = Subscriber$$1;
    TimeIntervalSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    TimeIntervalSubscriber.prototype.constructor = TimeIntervalSubscriber;
    TimeIntervalSubscriber.prototype._next = function _next (value) {
        var now = this.scheduler.now();
        var span = now - this.lastTime;
        this.lastTime = now;
        this.destination.next(new TimeInterval(value, span));
    };

    return TimeIntervalSubscriber;
}(Subscriber));

Observable.prototype.timeInterval = timeInterval;

/**
 * @param due
 * @param errorToSend
 * @param scheduler
 * @return {Observable<R>|WebSocketSubject<T>|Observable<T>}
 * @method timeout
 * @owner Observable
 */
function timeout(due, errorToSend, scheduler) {
    if ( errorToSend === void 0 ) errorToSend = null;
    if ( scheduler === void 0 ) scheduler = async;

    var absoluteTimeout = isDate(due);
    var waitFor = absoluteTimeout ? (+due - scheduler.now()) : Math.abs(due);
    return this.lift(new TimeoutOperator(waitFor, absoluteTimeout, errorToSend, scheduler));
}
var TimeoutOperator = function TimeoutOperator(waitFor, absoluteTimeout, errorToSend, scheduler) {
    this.waitFor = waitFor;
    this.absoluteTimeout = absoluteTimeout;
    this.errorToSend = errorToSend;
    this.scheduler = scheduler;
};
TimeoutOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new TimeoutSubscriber(subscriber, this.absoluteTimeout, this.waitFor, this.errorToSend, this.scheduler));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var TimeoutSubscriber = (function (Subscriber$$1) {
    function TimeoutSubscriber(destination, absoluteTimeout, waitFor, errorToSend, scheduler) {
        Subscriber$$1.call(this, destination);
        this.absoluteTimeout = absoluteTimeout;
        this.waitFor = waitFor;
        this.errorToSend = errorToSend;
        this.scheduler = scheduler;
        this.index = 0;
        this._previousIndex = 0;
        this._hasCompleted = false;
        this.scheduleTimeout();
    }

    if ( Subscriber$$1 ) TimeoutSubscriber.__proto__ = Subscriber$$1;
    TimeoutSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    TimeoutSubscriber.prototype.constructor = TimeoutSubscriber;

    var prototypeAccessors = { previousIndex: {},hasCompleted: {} };
    prototypeAccessors.previousIndex.get = function () {
        return this._previousIndex;
    };
    prototypeAccessors.hasCompleted.get = function () {
        return this._hasCompleted;
    };
    TimeoutSubscriber.dispatchTimeout = function dispatchTimeout (state) {
        var source = state.subscriber;
        var currentIndex = state.index;
        if (!source.hasCompleted && source.previousIndex === currentIndex) {
            source.notifyTimeout();
        }
    };
    TimeoutSubscriber.prototype.scheduleTimeout = function scheduleTimeout () {
        var currentIndex = this.index;
        this.scheduler.schedule(TimeoutSubscriber.dispatchTimeout, this.waitFor, { subscriber: this, index: currentIndex });
        this.index++;
        this._previousIndex = currentIndex;
    };
    TimeoutSubscriber.prototype._next = function _next (value) {
        this.destination.next(value);
        if (!this.absoluteTimeout) {
            this.scheduleTimeout();
        }
    };
    TimeoutSubscriber.prototype._error = function _error (err) {
        this.destination.error(err);
        this._hasCompleted = true;
    };
    TimeoutSubscriber.prototype._complete = function _complete () {
        this.destination.complete();
        this._hasCompleted = true;
    };
    TimeoutSubscriber.prototype.notifyTimeout = function notifyTimeout () {
        this.error(this.errorToSend || new Error('timeout'));
    };

    Object.defineProperties( TimeoutSubscriber.prototype, prototypeAccessors );

    return TimeoutSubscriber;
}(Subscriber));

Observable.prototype.timeout = timeout;

/**
 * @param due
 * @param withObservable
 * @param scheduler
 * @return {Observable<R>|WebSocketSubject<T>|Observable<T>}
 * @method timeoutWith
 * @owner Observable
 */
function timeoutWith(due, withObservable, scheduler) {
    if ( scheduler === void 0 ) scheduler = async;

    var absoluteTimeout = isDate(due);
    var waitFor = absoluteTimeout ? (+due - scheduler.now()) : Math.abs(due);
    return this.lift(new TimeoutWithOperator(waitFor, absoluteTimeout, withObservable, scheduler));
}
var TimeoutWithOperator = function TimeoutWithOperator(waitFor, absoluteTimeout, withObservable, scheduler) {
    this.waitFor = waitFor;
    this.absoluteTimeout = absoluteTimeout;
    this.withObservable = withObservable;
    this.scheduler = scheduler;
};
TimeoutWithOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new TimeoutWithSubscriber(subscriber, this.absoluteTimeout, this.waitFor, this.withObservable, this.scheduler));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var TimeoutWithSubscriber = (function (OuterSubscriber$$1) {
    function TimeoutWithSubscriber(destination, absoluteTimeout, waitFor, withObservable, scheduler) {
        OuterSubscriber$$1.call(this);
        this.destination = destination;
        this.absoluteTimeout = absoluteTimeout;
        this.waitFor = waitFor;
        this.withObservable = withObservable;
        this.scheduler = scheduler;
        this.timeoutSubscription = undefined;
        this.index = 0;
        this._previousIndex = 0;
        this._hasCompleted = false;
        destination.add(this);
        this.scheduleTimeout();
    }

    if ( OuterSubscriber$$1 ) TimeoutWithSubscriber.__proto__ = OuterSubscriber$$1;
    TimeoutWithSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    TimeoutWithSubscriber.prototype.constructor = TimeoutWithSubscriber;

    var prototypeAccessors = { previousIndex: {},hasCompleted: {} };
    prototypeAccessors.previousIndex.get = function () {
        return this._previousIndex;
    };
    prototypeAccessors.hasCompleted.get = function () {
        return this._hasCompleted;
    };
    TimeoutWithSubscriber.dispatchTimeout = function dispatchTimeout (state) {
        var source = state.subscriber;
        var currentIndex = state.index;
        if (!source.hasCompleted && source.previousIndex === currentIndex) {
            source.handleTimeout();
        }
    };
    TimeoutWithSubscriber.prototype.scheduleTimeout = function scheduleTimeout () {
        var currentIndex = this.index;
        var timeoutState = { subscriber: this, index: currentIndex };
        this.scheduler.schedule(TimeoutWithSubscriber.dispatchTimeout, this.waitFor, timeoutState);
        this.index++;
        this._previousIndex = currentIndex;
    };
    TimeoutWithSubscriber.prototype._next = function _next (value) {
        this.destination.next(value);
        if (!this.absoluteTimeout) {
            this.scheduleTimeout();
        }
    };
    TimeoutWithSubscriber.prototype._error = function _error (err) {
        this.destination.error(err);
        this._hasCompleted = true;
    };
    TimeoutWithSubscriber.prototype._complete = function _complete () {
        this.destination.complete();
        this._hasCompleted = true;
    };
    TimeoutWithSubscriber.prototype.handleTimeout = function handleTimeout () {
        if (!this.closed) {
            var withObservable = this.withObservable;
            this.unsubscribe();
            this.destination.add(this.timeoutSubscription = subscribeToResult(this, withObservable));
        }
    };

    Object.defineProperties( TimeoutWithSubscriber.prototype, prototypeAccessors );

    return TimeoutWithSubscriber;
}(OuterSubscriber));

Observable.prototype.timeoutWith = timeoutWith;

/**
 * @param scheduler
 * @return {Observable<Timestamp<any>>|WebSocketSubject<T>|Observable<T>}
 * @method timestamp
 * @owner Observable
 */
function timestamp(scheduler) {
    if ( scheduler === void 0 ) scheduler = async;

    return this.lift(new TimestampOperator(scheduler));
}
var Timestamp = function Timestamp(value, timestamp) {
    this.value = value;
    this.timestamp = timestamp;
};

var TimestampOperator = function TimestampOperator(scheduler) {
    this.scheduler = scheduler;
};
TimestampOperator.prototype.call = function call (observer, source) {
    return source._subscribe(new TimestampSubscriber(observer, this.scheduler));
};
var TimestampSubscriber = (function (Subscriber$$1) {
    function TimestampSubscriber(destination, scheduler) {
        Subscriber$$1.call(this, destination);
        this.scheduler = scheduler;
    }

    if ( Subscriber$$1 ) TimestampSubscriber.__proto__ = Subscriber$$1;
    TimestampSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    TimestampSubscriber.prototype.constructor = TimestampSubscriber;
    TimestampSubscriber.prototype._next = function _next (value) {
        var now = this.scheduler.now();
        this.destination.next(new Timestamp(value, now));
    };

    return TimestampSubscriber;
}(Subscriber));

Observable.prototype.timestamp = timestamp;

/**
 * @return {Observable<any[]>|WebSocketSubject<T>|Observable<T>}
 * @method toArray
 * @owner Observable
 */
function toArray() {
    return this.lift(new ToArrayOperator());
}
var ToArrayOperator = function ToArrayOperator () {};

ToArrayOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new ToArraySubscriber(subscriber));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ToArraySubscriber = (function (Subscriber$$1) {
    function ToArraySubscriber(destination) {
        Subscriber$$1.call(this, destination);
        this.array = [];
    }

    if ( Subscriber$$1 ) ToArraySubscriber.__proto__ = Subscriber$$1;
    ToArraySubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    ToArraySubscriber.prototype.constructor = ToArraySubscriber;
    ToArraySubscriber.prototype._next = function _next (x) {
        this.array.push(x);
    };
    ToArraySubscriber.prototype._complete = function _complete () {
        this.destination.next(this.array);
        this.destination.complete();
    };

    return ToArraySubscriber;
}(Subscriber));

Observable.prototype.toArray = toArray;

/**
 * @param PromiseCtor
 * @return {Promise<T>}
 * @method toPromise
 * @owner Observable
 */
function toPromise(PromiseCtor) {
    var this$1 = this;

    if (!PromiseCtor) {
        if (root.Rx && root.Rx.config && root.Rx.config.Promise) {
            PromiseCtor = root.Rx.config.Promise;
        }
        else if (root.Promise) {
            PromiseCtor = root.Promise;
        }
    }
    if (!PromiseCtor) {
        throw new Error('no Promise impl found');
    }
    return new PromiseCtor(function (resolve, reject) {
        var value;
        this$1.subscribe(function (x) { return value = x; }, function (err) { return reject(err); }, function () { return resolve(value); });
    });
}

Observable.prototype.toPromise = toPromise;

/**
 * Branch out the source Observable values as a nested Observable whenever
 * `windowBoundaries` emits.
 *
 * <span class="informal">It's like {@link buffer}, but emits a nested Observable
 * instead of an array.</span>
 *
 * <img src="./img/window.png" width="100%">
 *
 * Returns an Observable that emits windows of items it collects from the source
 * Observable. The output Observable emits connected, non-overlapping
 * windows. It emits the current window and opens a new one whenever the
 * Observable `windowBoundaries` emits an item. Because each window is an
 * Observable, the output is a higher-order Observable.
 *
 * @example <caption>In every window of 1 second each, emit at most 2 click events</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var interval = Rx.Observable.interval(1000);
 * var result = clicks.window(interval)
 *   .map(win => win.take(2)) // each window has at most 2 emissions
 *   .mergeAll(); // flatten the Observable-of-Observables
 * result.subscribe(x => console.log(x));
 *
 * @see {@link windowCount}
 * @see {@link windowTime}
 * @see {@link windowToggle}
 * @see {@link windowWhen}
 * @see {@link buffer}
 *
 * @param {Observable<any>} windowBoundaries An Observable that completes the
 * previous window and starts a new window.
 * @return {Observable<Observable<T>>} An Observable of windows, which are
 * Observables emitting values of the source Observable.
 * @method window
 * @owner Observable
 */
function window$1(windowBoundaries) {
    return this.lift(new WindowOperator(windowBoundaries));
}
var WindowOperator = function WindowOperator(windowBoundaries) {
    this.windowBoundaries = windowBoundaries;
};
WindowOperator.prototype.call = function call (subscriber, source) {
    var windowSubscriber = new WindowSubscriber(subscriber);
    var sourceSubscription = source._subscribe(windowSubscriber);
    if (!sourceSubscription.closed) {
        windowSubscriber.add(subscribeToResult(windowSubscriber, this.windowBoundaries));
    }
    return sourceSubscription;
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var WindowSubscriber = (function (OuterSubscriber$$1) {
    function WindowSubscriber(destination) {
        OuterSubscriber$$1.call(this, destination);
        this.window = new Subject();
        destination.next(this.window);
    }

    if ( OuterSubscriber$$1 ) WindowSubscriber.__proto__ = OuterSubscriber$$1;
    WindowSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    WindowSubscriber.prototype.constructor = WindowSubscriber;
    WindowSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.openWindow();
    };
    WindowSubscriber.prototype.notifyError = function notifyError (error, innerSub) {
        this._error(error);
    };
    WindowSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        this._complete();
    };
    WindowSubscriber.prototype._next = function _next (value) {
        this.window.next(value);
    };
    WindowSubscriber.prototype._error = function _error (err) {
        this.window.error(err);
        this.destination.error(err);
    };
    WindowSubscriber.prototype._complete = function _complete () {
        this.window.complete();
        this.destination.complete();
    };
    WindowSubscriber.prototype._unsubscribe = function _unsubscribe () {
        this.window = null;
    };
    WindowSubscriber.prototype.openWindow = function openWindow () {
        var prevWindow = this.window;
        if (prevWindow) {
            prevWindow.complete();
        }
        var destination = this.destination;
        var newWindow = this.window = new Subject();
        destination.next(newWindow);
    };

    return WindowSubscriber;
}(OuterSubscriber));

Observable.prototype.window = window$1;

/**
 * Branch out the source Observable values as a nested Observable with each
 * nested Observable emitting at most `windowSize` values.
 *
 * <span class="informal">It's like {@link bufferCount}, but emits a nested
 * Observable instead of an array.</span>
 *
 * <img src="./img/windowCount.png" width="100%">
 *
 * Returns an Observable that emits windows of items it collects from the source
 * Observable. The output Observable emits windows every `startWindowEvery`
 * items, each containing no more than `windowSize` items. When the source
 * Observable completes or encounters an error, the output Observable emits
 * the current window and propagates the notification from the source
 * Observable. If `startWindowEvery` is not provided, then new windows are
 * started immediately at the start of the source and when each window completes
 * with size `windowSize`.
 *
 * @example <caption>Ignore every 3rd click event, starting from the first one</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.windowCount(3)
 *   .map(win => win.skip(1)) // skip first of every 3 clicks
 *   .mergeAll(); // flatten the Observable-of-Observables
 * result.subscribe(x => console.log(x));
 *
 * @example <caption>Ignore every 3rd click event, starting from the third one</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.windowCount(2, 3)
 *   .mergeAll(); // flatten the Observable-of-Observables
 * result.subscribe(x => console.log(x));
 *
 * @see {@link window}
 * @see {@link windowTime}
 * @see {@link windowToggle}
 * @see {@link windowWhen}
 * @see {@link bufferCount}
 *
 * @param {number} windowSize The maximum number of values emitted by each
 * window.
 * @param {number} [startWindowEvery] Interval at which to start a new window.
 * For example if `startWindowEvery` is `2`, then a new window will be started
 * on every other value from the source. A new window is started at the
 * beginning of the source by default.
 * @return {Observable<Observable<T>>} An Observable of windows, which in turn
 * are Observable of values.
 * @method windowCount
 * @owner Observable
 */
function windowCount(windowSize, startWindowEvery) {
    if ( startWindowEvery === void 0 ) startWindowEvery = 0;

    return this.lift(new WindowCountOperator(windowSize, startWindowEvery));
}
var WindowCountOperator = function WindowCountOperator(windowSize, startWindowEvery) {
    this.windowSize = windowSize;
    this.startWindowEvery = startWindowEvery;
};
WindowCountOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new WindowCountSubscriber(subscriber, this.windowSize, this.startWindowEvery));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var WindowCountSubscriber = (function (Subscriber$$1) {
    function WindowCountSubscriber(destination, windowSize, startWindowEvery) {
        Subscriber$$1.call(this, destination);
        this.destination = destination;
        this.windowSize = windowSize;
        this.startWindowEvery = startWindowEvery;
        this.windows = [new Subject()];
        this.count = 0;
        destination.next(this.windows[0]);
    }

    if ( Subscriber$$1 ) WindowCountSubscriber.__proto__ = Subscriber$$1;
    WindowCountSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    WindowCountSubscriber.prototype.constructor = WindowCountSubscriber;
    WindowCountSubscriber.prototype._next = function _next (value) {
        var startWindowEvery = (this.startWindowEvery > 0) ? this.startWindowEvery : this.windowSize;
        var destination = this.destination;
        var windowSize = this.windowSize;
        var windows = this.windows;
        var len = windows.length;
        for (var i = 0; i < len && !this.closed; i++) {
            windows[i].next(value);
        }
        var c = this.count - windowSize + 1;
        if (c >= 0 && c % startWindowEvery === 0 && !this.closed) {
            windows.shift().complete();
        }
        if (++this.count % startWindowEvery === 0 && !this.closed) {
            var window = new Subject();
            windows.push(window);
            destination.next(window);
        }
    };
    WindowCountSubscriber.prototype._error = function _error (err) {
        var windows = this.windows;
        if (windows) {
            while (windows.length > 0 && !this.closed) {
                windows.shift().error(err);
            }
        }
        this.destination.error(err);
    };
    WindowCountSubscriber.prototype._complete = function _complete () {
        var windows = this.windows;
        if (windows) {
            while (windows.length > 0 && !this.closed) {
                windows.shift().complete();
            }
        }
        this.destination.complete();
    };
    WindowCountSubscriber.prototype._unsubscribe = function _unsubscribe () {
        this.count = 0;
        this.windows = null;
    };

    return WindowCountSubscriber;
}(Subscriber));

Observable.prototype.windowCount = windowCount;

/**
 * Branch out the source Observable values as a nested Observable periodically
 * in time.
 *
 * <span class="informal">It's like {@link bufferTime}, but emits a nested
 * Observable instead of an array.</span>
 *
 * <img src="./img/windowTime.png" width="100%">
 *
 * Returns an Observable that emits windows of items it collects from the source
 * Observable. The output Observable starts a new window periodically, as
 * determined by the `windowCreationInterval` argument. It emits each window
 * after a fixed timespan, specified by the `windowTimeSpan` argument. When the
 * source Observable completes or encounters an error, the output Observable
 * emits the current window and propagates the notification from the source
 * Observable. If `windowCreationInterval` is not provided, the output
 * Observable starts a new window when the previous window of duration
 * `windowTimeSpan` completes.
 *
 * @example <caption>In every window of 1 second each, emit at most 2 click events</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.windowTime(1000)
 *   .map(win => win.take(2)) // each window has at most 2 emissions
 *   .mergeAll(); // flatten the Observable-of-Observables
 * result.subscribe(x => console.log(x));
 *
 * @example <caption>Every 5 seconds start a window 1 second long, and emit at most 2 click events per window</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks.windowTime(1000, 5000)
 *   .map(win => win.take(2)) // each window has at most 2 emissions
 *   .mergeAll(); // flatten the Observable-of-Observables
 * result.subscribe(x => console.log(x));
 *
 * @see {@link window}
 * @see {@link windowCount}
 * @see {@link windowToggle}
 * @see {@link windowWhen}
 * @see {@link bufferTime}
 *
 * @param {number} windowTimeSpan The amount of time to fill each window.
 * @param {number} [windowCreationInterval] The interval at which to start new
 * windows.
 * @param {Scheduler} [scheduler=async] The scheduler on which to schedule the
 * intervals that determine window boundaries.
 * @return {Observable<Observable<T>>} An observable of windows, which in turn
 * are Observables.
 * @method windowTime
 * @owner Observable
 */
function windowTime(windowTimeSpan, windowCreationInterval, scheduler) {
    if ( windowCreationInterval === void 0 ) windowCreationInterval = null;
    if ( scheduler === void 0 ) scheduler = async;

    return this.lift(new WindowTimeOperator(windowTimeSpan, windowCreationInterval, scheduler));
}
var WindowTimeOperator = function WindowTimeOperator(windowTimeSpan, windowCreationInterval, scheduler) {
    this.windowTimeSpan = windowTimeSpan;
    this.windowCreationInterval = windowCreationInterval;
    this.scheduler = scheduler;
};
WindowTimeOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new WindowTimeSubscriber(subscriber, this.windowTimeSpan, this.windowCreationInterval, this.scheduler));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var WindowTimeSubscriber = (function (Subscriber$$1) {
    function WindowTimeSubscriber(destination, windowTimeSpan, windowCreationInterval, scheduler) {
        Subscriber$$1.call(this, destination);
        this.destination = destination;
        this.windowTimeSpan = windowTimeSpan;
        this.windowCreationInterval = windowCreationInterval;
        this.scheduler = scheduler;
        this.windows = [];
        if (windowCreationInterval !== null && windowCreationInterval >= 0) {
            var window = this.openWindow();
            var closeState = { subscriber: this, window: window, context: null };
            var creationState = { windowTimeSpan: windowTimeSpan, windowCreationInterval: windowCreationInterval, subscriber: this, scheduler: scheduler };
            this.add(scheduler.schedule(dispatchWindowClose, windowTimeSpan, closeState));
            this.add(scheduler.schedule(dispatchWindowCreation, windowCreationInterval, creationState));
        }
        else {
            var window$1 = this.openWindow();
            var timeSpanOnlyState = { subscriber: this, window: window$1, windowTimeSpan: windowTimeSpan };
            this.add(scheduler.schedule(dispatchWindowTimeSpanOnly, windowTimeSpan, timeSpanOnlyState));
        }
    }

    if ( Subscriber$$1 ) WindowTimeSubscriber.__proto__ = Subscriber$$1;
    WindowTimeSubscriber.prototype = Object.create( Subscriber$$1 && Subscriber$$1.prototype );
    WindowTimeSubscriber.prototype.constructor = WindowTimeSubscriber;
    WindowTimeSubscriber.prototype._next = function _next (value) {
        var windows = this.windows;
        var len = windows.length;
        for (var i = 0; i < len; i++) {
            var window = windows[i];
            if (!window.closed) {
                window.next(value);
            }
        }
    };
    WindowTimeSubscriber.prototype._error = function _error (err) {
        var windows = this.windows;
        while (windows.length > 0) {
            windows.shift().error(err);
        }
        this.destination.error(err);
    };
    WindowTimeSubscriber.prototype._complete = function _complete () {
        var windows = this.windows;
        while (windows.length > 0) {
            var window = windows.shift();
            if (!window.closed) {
                window.complete();
            }
        }
        this.destination.complete();
    };
    WindowTimeSubscriber.prototype.openWindow = function openWindow () {
        var window = new Subject();
        this.windows.push(window);
        var destination = this.destination;
        destination.next(window);
        return window;
    };
    WindowTimeSubscriber.prototype.closeWindow = function closeWindow (window) {
        window.complete();
        var windows = this.windows;
        windows.splice(windows.indexOf(window), 1);
    };

    return WindowTimeSubscriber;
}(Subscriber));
function dispatchWindowTimeSpanOnly(state) {
    var subscriber = state.subscriber;
    var windowTimeSpan = state.windowTimeSpan;
    var window = state.window;
    if (window) {
        window.complete();
    }
    state.window = subscriber.openWindow();
    this.schedule(state, windowTimeSpan);
}
function dispatchWindowCreation(state) {
    var windowTimeSpan = state.windowTimeSpan;
    var subscriber = state.subscriber;
    var scheduler = state.scheduler;
    var windowCreationInterval = state.windowCreationInterval;
    var window = subscriber.openWindow();
    var action = this;
    var context = { action: action, subscription: null };
    var timeSpanState = { subscriber: subscriber, window: window, context: context };
    context.subscription = scheduler.schedule(dispatchWindowClose, windowTimeSpan, timeSpanState);
    action.add(context.subscription);
    action.schedule(state, windowCreationInterval);
}
function dispatchWindowClose(arg) {
    var subscriber = arg.subscriber;
    var window = arg.window;
    var context = arg.context;
    if (context && context.action && context.subscription) {
        context.action.remove(context.subscription);
    }
    subscriber.closeWindow(window);
}

Observable.prototype.windowTime = windowTime;

/**
 * Branch out the source Observable values as a nested Observable starting from
 * an emission from `openings` and ending when the output of `closingSelector`
 * emits.
 *
 * <span class="informal">It's like {@link bufferToggle}, but emits a nested
 * Observable instead of an array.</span>
 *
 * <img src="./img/windowToggle.png" width="100%">
 *
 * Returns an Observable that emits windows of items it collects from the source
 * Observable. The output Observable emits windows that contain those items
 * emitted by the source Observable between the time when the `openings`
 * Observable emits an item and when the Observable returned by
 * `closingSelector` emits an item.
 *
 * @example <caption>Every other second, emit the click events from the next 500ms</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var openings = Rx.Observable.interval(1000);
 * var result = clicks.windowToggle(openings, i =>
 *   i % 2 ? Rx.Observable.interval(500) : Rx.Observable.empty()
 * ).mergeAll();
 * result.subscribe(x => console.log(x));
 *
 * @see {@link window}
 * @see {@link windowCount}
 * @see {@link windowTime}
 * @see {@link windowWhen}
 * @see {@link bufferToggle}
 *
 * @param {Observable<O>} openings An observable of notifications to start new
 * windows.
 * @param {function(value: O): Observable} closingSelector A function that takes
 * the value emitted by the `openings` observable and returns an Observable,
 * which, when it emits (either `next` or `complete`), signals that the
 * associated window should complete.
 * @return {Observable<Observable<T>>} An observable of windows, which in turn
 * are Observables.
 * @method windowToggle
 * @owner Observable
 */
function windowToggle(openings, closingSelector) {
    return this.lift(new WindowToggleOperator(openings, closingSelector));
}
var WindowToggleOperator = function WindowToggleOperator(openings, closingSelector) {
    this.openings = openings;
    this.closingSelector = closingSelector;
};
WindowToggleOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new WindowToggleSubscriber(subscriber, this.openings, this.closingSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var WindowToggleSubscriber = (function (OuterSubscriber$$1) {
    function WindowToggleSubscriber(destination, openings, closingSelector) {
        OuterSubscriber$$1.call(this, destination);
        this.openings = openings;
        this.closingSelector = closingSelector;
        this.contexts = [];
        this.add(this.openSubscription = subscribeToResult(this, openings, openings));
    }

    if ( OuterSubscriber$$1 ) WindowToggleSubscriber.__proto__ = OuterSubscriber$$1;
    WindowToggleSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    WindowToggleSubscriber.prototype.constructor = WindowToggleSubscriber;
    WindowToggleSubscriber.prototype._next = function _next (value) {
        var ref = this;
        var contexts = ref.contexts;
        if (contexts) {
            var len = contexts.length;
            for (var i = 0; i < len; i++) {
                contexts[i].window.next(value);
            }
        }
    };
    WindowToggleSubscriber.prototype._error = function _error (err) {
        var ref = this;
        var contexts = ref.contexts;
        this.contexts = null;
        if (contexts) {
            var len = contexts.length;
            var index = -1;
            while (++index < len) {
                var context = contexts[index];
                context.window.error(err);
                context.subscription.unsubscribe();
            }
        }
        OuterSubscriber$$1.prototype._error.call(this, err);
    };
    WindowToggleSubscriber.prototype._complete = function _complete () {
        var ref = this;
        var contexts = ref.contexts;
        this.contexts = null;
        if (contexts) {
            var len = contexts.length;
            var index = -1;
            while (++index < len) {
                var context = contexts[index];
                context.window.complete();
                context.subscription.unsubscribe();
            }
        }
        OuterSubscriber$$1.prototype._complete.call(this);
    };
    WindowToggleSubscriber.prototype._unsubscribe = function _unsubscribe () {
        var ref = this;
        var contexts = ref.contexts;
        this.contexts = null;
        if (contexts) {
            var len = contexts.length;
            var index = -1;
            while (++index < len) {
                var context = contexts[index];
                context.window.unsubscribe();
                context.subscription.unsubscribe();
            }
        }
    };
    WindowToggleSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        if (outerValue === this.openings) {
            var ref = this;
            var closingSelector = ref.closingSelector;
            var closingNotifier = tryCatch(closingSelector)(innerValue);
            if (closingNotifier === errorObject) {
                return this.error(errorObject.e);
            }
            else {
                var window = new Subject();
                var subscription = new Subscription();
                var context = { window: window, subscription: subscription };
                this.contexts.push(context);
                var innerSubscription = subscribeToResult(this, closingNotifier, context);
                if (innerSubscription.closed) {
                    this.closeWindow(this.contexts.length - 1);
                }
                else {
                    innerSubscription.context = context;
                    subscription.add(innerSubscription);
                }
                this.destination.next(window);
            }
        }
        else {
            this.closeWindow(this.contexts.indexOf(outerValue));
        }
    };
    WindowToggleSubscriber.prototype.notifyError = function notifyError (err) {
        this.error(err);
    };
    WindowToggleSubscriber.prototype.notifyComplete = function notifyComplete (inner) {
        if (inner !== this.openSubscription) {
            this.closeWindow(this.contexts.indexOf(inner.context));
        }
    };
    WindowToggleSubscriber.prototype.closeWindow = function closeWindow (index) {
        if (index === -1) {
            return;
        }
        var ref = this;
        var contexts = ref.contexts;
        var context = contexts[index];
        var window = context.window;
        var subscription = context.subscription;
        contexts.splice(index, 1);
        window.complete();
        subscription.unsubscribe();
    };

    return WindowToggleSubscriber;
}(OuterSubscriber));

Observable.prototype.windowToggle = windowToggle;

/**
 * Branch out the source Observable values as a nested Observable using a
 * factory function of closing Observables to determine when to start a new
 * window.
 *
 * <span class="informal">It's like {@link bufferWhen}, but emits a nested
 * Observable instead of an array.</span>
 *
 * <img src="./img/windowWhen.png" width="100%">
 *
 * Returns an Observable that emits windows of items it collects from the source
 * Observable. The output Observable emits connected, non-overlapping windows.
 * It emits the current window and opens a new one whenever the Observable
 * produced by the specified `closingSelector` function emits an item. The first
 * window is opened immediately when subscribing to the output Observable.
 *
 * @example <caption>Emit only the first two clicks events in every window of [1-5] random seconds</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var result = clicks
 *   .windowWhen(() => Rx.Observable.interval(1000 + Math.random() * 4000))
 *   .map(win => win.take(2)) // each window has at most 2 emissions
 *   .mergeAll(); // flatten the Observable-of-Observables
 * result.subscribe(x => console.log(x));
 *
 * @see {@link window}
 * @see {@link windowCount}
 * @see {@link windowTime}
 * @see {@link windowToggle}
 * @see {@link bufferWhen}
 *
 * @param {function(): Observable} closingSelector A function that takes no
 * arguments and returns an Observable that signals (on either `next` or
 * `complete`) when to close the previous window and start a new one.
 * @return {Observable<Observable<T>>} An observable of windows, which in turn
 * are Observables.
 * @method windowWhen
 * @owner Observable
 */
function windowWhen(closingSelector) {
    return this.lift(new WindowOperator$1(closingSelector));
}
var WindowOperator$1 = function WindowOperator$1(closingSelector) {
    this.closingSelector = closingSelector;
};
WindowOperator$1.prototype.call = function call (subscriber, source) {
    return source._subscribe(new WindowSubscriber$1(subscriber, this.closingSelector));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var WindowSubscriber$1 = (function (OuterSubscriber$$1) {
    function WindowSubscriber(destination, closingSelector) {
        OuterSubscriber$$1.call(this, destination);
        this.destination = destination;
        this.closingSelector = closingSelector;
        this.openWindow();
    }

    if ( OuterSubscriber$$1 ) WindowSubscriber.__proto__ = OuterSubscriber$$1;
    WindowSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    WindowSubscriber.prototype.constructor = WindowSubscriber;
    WindowSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.openWindow(innerSub);
    };
    WindowSubscriber.prototype.notifyError = function notifyError (error, innerSub) {
        this._error(error);
    };
    WindowSubscriber.prototype.notifyComplete = function notifyComplete (innerSub) {
        this.openWindow(innerSub);
    };
    WindowSubscriber.prototype._next = function _next (value) {
        this.window.next(value);
    };
    WindowSubscriber.prototype._error = function _error (err) {
        this.window.error(err);
        this.destination.error(err);
        this.unsubscribeClosingNotification();
    };
    WindowSubscriber.prototype._complete = function _complete () {
        this.window.complete();
        this.destination.complete();
        this.unsubscribeClosingNotification();
    };
    WindowSubscriber.prototype.unsubscribeClosingNotification = function unsubscribeClosingNotification () {
        if (this.closingNotification) {
            this.closingNotification.unsubscribe();
        }
    };
    WindowSubscriber.prototype.openWindow = function openWindow (innerSub) {
        if ( innerSub === void 0 ) innerSub = null;

        if (innerSub) {
            this.remove(innerSub);
            innerSub.unsubscribe();
        }
        var prevWindow = this.window;
        if (prevWindow) {
            prevWindow.complete();
        }
        var window = this.window = new Subject();
        this.destination.next(window);
        var closingNotifier = tryCatch(this.closingSelector)();
        if (closingNotifier === errorObject) {
            var err = errorObject.e;
            this.destination.error(err);
            this.window.error(err);
        }
        else {
            this.add(this.closingNotification = subscribeToResult(this, closingNotifier));
        }
    };

    return WindowSubscriber;
}(OuterSubscriber));

Observable.prototype.windowWhen = windowWhen;

/**
 * Combines the source Observable with other Observables to create an Observable
 * whose values are calculated from the latest values of each, only when the
 * source emits.
 *
 * <span class="informal">Whenever the source Observable emits a value, it
 * computes a formula using that value plus the latest values from other input
 * Observables, then emits the output of that formula.</span>
 *
 * <img src="./img/withLatestFrom.png" width="100%">
 *
 * `withLatestFrom` combines each value from the source Observable (the
 * instance) with the latest values from the other input Observables only when
 * the source emits a value, optionally using a `project` function to determine
 * the value to be emitted on the output Observable. All input Observables must
 * emit at least one value before the output Observable will emit a value.
 *
 * @example <caption>On every click event, emit an array with the latest timer event plus the click event</caption>
 * var clicks = Rx.Observable.fromEvent(document, 'click');
 * var timer = Rx.Observable.interval(1000);
 * var result = clicks.withLatestFrom(timer);
 * result.subscribe(x => console.log(x));
 *
 * @see {@link combineLatest}
 *
 * @param {Observable} other An input Observable to combine with the source
 * Observable. More than one input Observables may be given as argument.
 * @param {Function} [project] Projection function for combining values
 * together. Receives all values in order of the Observables passed, where the
 * first parameter is a value from the source Observable. (e.g.
 * `a.withLatestFrom(b, c, (a1, b1, c1) => a1 + b1 + c1)`). If this is not
 * passed, arrays will be emitted on the output Observable.
 * @return {Observable} An Observable of projected values from the most recent
 * values from each input Observable, or an array of the most recent values from
 * each input Observable.
 * @method withLatestFrom
 * @owner Observable
 */
function withLatestFrom() {
    var args = [], len = arguments.length;
    while ( len-- ) args[ len ] = arguments[ len ];

    var project;
    if (typeof args[args.length - 1] === 'function') {
        project = args.pop();
    }
    var observables = args;
    return this.lift(new WithLatestFromOperator(observables, project));
}
/* tslint:enable:max-line-length */
var WithLatestFromOperator = function WithLatestFromOperator(observables, project) {
    this.observables = observables;
    this.project = project;
};
WithLatestFromOperator.prototype.call = function call (subscriber, source) {
    return source._subscribe(new WithLatestFromSubscriber(subscriber, this.observables, this.project));
};
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var WithLatestFromSubscriber = (function (OuterSubscriber$$1) {
    function WithLatestFromSubscriber(destination, observables, project) {
        var this$1 = this;

        OuterSubscriber$$1.call(this, destination);
        this.observables = observables;
        this.project = project;
        this.toRespond = [];
        var len = observables.length;
        this.values = new Array(len);
        for (var i = 0; i < len; i++) {
            this$1.toRespond.push(i);
        }
        for (var i$1 = 0; i$1 < len; i$1++) {
            var observable = observables[i$1];
            this$1.add(subscribeToResult(this$1, observable, observable, i$1));
        }
    }

    if ( OuterSubscriber$$1 ) WithLatestFromSubscriber.__proto__ = OuterSubscriber$$1;
    WithLatestFromSubscriber.prototype = Object.create( OuterSubscriber$$1 && OuterSubscriber$$1.prototype );
    WithLatestFromSubscriber.prototype.constructor = WithLatestFromSubscriber;
    WithLatestFromSubscriber.prototype.notifyNext = function notifyNext (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
        this.values[outerIndex] = innerValue;
        var toRespond = this.toRespond;
        if (toRespond.length > 0) {
            var found = toRespond.indexOf(outerIndex);
            if (found !== -1) {
                toRespond.splice(found, 1);
            }
        }
    };
    WithLatestFromSubscriber.prototype.notifyComplete = function notifyComplete () {
        // noop
    };
    WithLatestFromSubscriber.prototype._next = function _next (value) {
        if (this.toRespond.length === 0) {
            var args = [value ].concat( this.values);
            if (this.project) {
                this._tryProject(args);
            }
            else {
                this.destination.next(args);
            }
        }
    };
    WithLatestFromSubscriber.prototype._tryProject = function _tryProject (args) {
        var result;
        try {
            result = this.project.apply(this, args);
        }
        catch (err) {
            this.destination.error(err);
            return;
        }
        this.destination.next(result);
    };

    return WithLatestFromSubscriber;
}(OuterSubscriber));

Observable.prototype.withLatestFrom = withLatestFrom;

Observable.prototype.zip = zipProto;

/**
 * @param project
 * @return {Observable<R>|WebSocketSubject<T>|Observable<T>}
 * @method zipAll
 * @owner Observable
 */
function zipAll(project) {
    return this.lift(new ZipOperator(project));
}

Observable.prototype.zipAll = zipAll;

var SubscriptionLog = function SubscriptionLog(subscribedFrame, unsubscribedFrame) {
    if ( unsubscribedFrame === void 0 ) unsubscribedFrame = Number.POSITIVE_INFINITY;

    this.subscribedFrame = subscribedFrame;
    this.unsubscribedFrame = unsubscribedFrame;
};

var SubscriptionLoggable = function SubscriptionLoggable() {
    this.subscriptions = [];
};
SubscriptionLoggable.prototype.logSubscribedFrame = function logSubscribedFrame () {
    this.subscriptions.push(new SubscriptionLog(this.scheduler.now()));
    return this.subscriptions.length - 1;
};
SubscriptionLoggable.prototype.logUnsubscribedFrame = function logUnsubscribedFrame (index) {
    var subscriptionLogs = this.subscriptions;
    var oldSubscriptionLog = subscriptionLogs[index];
    subscriptionLogs[index] = new SubscriptionLog(oldSubscriptionLog.subscribedFrame, this.scheduler.now());
};

function applyMixins(derivedCtor, baseCtors) {
    for (var i = 0, len = baseCtors.length; i < len; i++) {
        var baseCtor = baseCtors[i];
        var propertyKeys = Object.getOwnPropertyNames(baseCtor.prototype);
        for (var j = 0, len2 = propertyKeys.length; j < len2; j++) {
            var name = propertyKeys[j];
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        }
    }
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var ColdObservable = (function (Observable$$1) {
    function ColdObservable(messages, scheduler) {
        Observable$$1.call(this, function (subscriber) {
            var observable = this;
            var index = observable.logSubscribedFrame();
            subscriber.add(new Subscription(function () {
                observable.logUnsubscribedFrame(index);
            }));
            observable.scheduleMessages(subscriber);
            return subscriber;
        });
        this.messages = messages;
        this.subscriptions = [];
        this.scheduler = scheduler;
    }

    if ( Observable$$1 ) ColdObservable.__proto__ = Observable$$1;
    ColdObservable.prototype = Object.create( Observable$$1 && Observable$$1.prototype );
    ColdObservable.prototype.constructor = ColdObservable;
    ColdObservable.prototype.scheduleMessages = function scheduleMessages (subscriber) {
        var this$1 = this;

        var messagesLength = this.messages.length;
        for (var i = 0; i < messagesLength; i++) {
            var message = this$1.messages[i];
            subscriber.add(this$1.scheduler.schedule(function (ref) {
            var message = ref.message;
            var subscriber = ref.subscriber;
 message.notification.observe(subscriber); }, message.frame, { message: message, subscriber: subscriber }));
        }
    };

    return ColdObservable;
}(Observable));
applyMixins(ColdObservable, [SubscriptionLoggable]);

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var HotObservable = (function (Subject$$1) {
    function HotObservable(messages, scheduler) {
        Subject$$1.call(this);
        this.messages = messages;
        this.subscriptions = [];
        this.scheduler = scheduler;
    }

    if ( Subject$$1 ) HotObservable.__proto__ = Subject$$1;
    HotObservable.prototype = Object.create( Subject$$1 && Subject$$1.prototype );
    HotObservable.prototype.constructor = HotObservable;
    HotObservable.prototype._subscribe = function _subscribe (subscriber) {
        var subject = this;
        var index = subject.logSubscribedFrame();
        subscriber.add(new Subscription(function () {
            subject.logUnsubscribedFrame(index);
        }));
        return Subject$$1.prototype._subscribe.call(this, subscriber);
    };
    HotObservable.prototype.setup = function setup () {
        var subject = this;
        var messagesLength = subject.messages.length;
        /* tslint:disable:no-var-keyword */
        for (var i = 0; i < messagesLength; i++) {
            (function () {
                var message = subject.messages[i];
                /* tslint:enable */
                subject.scheduler.schedule(function () { message.notification.observe(subject); }, message.frame);
            })();
        }
    };

    return HotObservable;
}(Subject));
applyMixins(HotObservable, [SubscriptionLoggable]);

var VirtualTimeScheduler = (function (AsyncScheduler$$1) {
    function VirtualTimeScheduler(SchedulerAction, maxFrames) {
        var this$1 = this;
        if ( SchedulerAction === void 0 ) SchedulerAction = VirtualAction;
        if ( maxFrames === void 0 ) maxFrames = Number.POSITIVE_INFINITY;

        AsyncScheduler$$1.call(this, SchedulerAction, function () { return this$1.frame; });
        this.maxFrames = maxFrames;
        this.frame = 0;
        this.index = -1;
    }

    if ( AsyncScheduler$$1 ) VirtualTimeScheduler.__proto__ = AsyncScheduler$$1;
    VirtualTimeScheduler.prototype = Object.create( AsyncScheduler$$1 && AsyncScheduler$$1.prototype );
    VirtualTimeScheduler.prototype.constructor = VirtualTimeScheduler;
    /**
     * Prompt the Scheduler to execute all of its queued actions, therefore
     * clearing its queue.
     * @return {void}
     */
    VirtualTimeScheduler.prototype.flush = function flush () {
        var ref = this;
        var actions = ref.actions;
        var maxFrames = ref.maxFrames;
        var error, action;
        while ((action = actions.shift()) && (this.frame = action.delay) <= maxFrames) {
            if (error = action.execute(action.state, action.delay)) {
                break;
            }
        }
        if (error) {
            while (action = actions.shift()) {
                action.unsubscribe();
            }
            throw error;
        }
    };

    return VirtualTimeScheduler;
}(AsyncScheduler));
VirtualTimeScheduler.frameTimeFactor = 10;
/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var VirtualAction = (function (AsyncAction$$1) {
    function VirtualAction(scheduler, work, index) {
        if ( index === void 0 ) index = scheduler.index += 1;

        AsyncAction$$1.call(this, scheduler, work);
        this.scheduler = scheduler;
        this.work = work;
        this.index = index;
        this.index = scheduler.index = index;
    }

    if ( AsyncAction$$1 ) VirtualAction.__proto__ = AsyncAction$$1;
    VirtualAction.prototype = Object.create( AsyncAction$$1 && AsyncAction$$1.prototype );
    VirtualAction.prototype.constructor = VirtualAction;
    VirtualAction.prototype.schedule = function schedule (state, delay) {
        if ( delay === void 0 ) delay = 0;

        return !this.id ?
            AsyncAction$$1.prototype.schedule.call(this, state, delay) : this.add(new VirtualAction(this.scheduler, this.work)).schedule(state, delay);
    };
    VirtualAction.prototype.requestAsyncId = function requestAsyncId (scheduler, id, delay) {
        if ( delay === void 0 ) delay = 0;

        this.delay = scheduler.frame + delay;
        var actions = scheduler.actions;
        actions.push(this);
        actions.sort(VirtualAction.sortActions);
        return true;
    };
    VirtualAction.prototype.recycleAsyncId = function recycleAsyncId (scheduler, id, delay) {
        if ( delay === void 0 ) delay = 0;

        return undefined;
    };
    VirtualAction.sortActions = function sortActions (a, b) {
        if (a.delay === b.delay) {
            if (a.index === b.index) {
                return 0;
            }
            else if (a.index > b.index) {
                return 1;
            }
            else {
                return -1;
            }
        }
        else if (a.delay > b.delay) {
            return 1;
        }
        else {
            return -1;
        }
    };

    return VirtualAction;
}(AsyncAction));

var defaultMaxFrame = 750;
var TestScheduler = (function (VirtualTimeScheduler$$1) {
    function TestScheduler(assertDeepEqual) {
        VirtualTimeScheduler$$1.call(this, VirtualAction, defaultMaxFrame);
        this.assertDeepEqual = assertDeepEqual;
        this.hotObservables = [];
        this.coldObservables = [];
        this.flushTests = [];
    }

    if ( VirtualTimeScheduler$$1 ) TestScheduler.__proto__ = VirtualTimeScheduler$$1;
    TestScheduler.prototype = Object.create( VirtualTimeScheduler$$1 && VirtualTimeScheduler$$1.prototype );
    TestScheduler.prototype.constructor = TestScheduler;
    TestScheduler.prototype.createTime = function createTime (marbles) {
        var indexOf = marbles.indexOf('|');
        if (indexOf === -1) {
            throw new Error('marble diagram for time should have a completion marker "|"');
        }
        return indexOf * TestScheduler.frameTimeFactor;
    };
    TestScheduler.prototype.createColdObservable = function createColdObservable (marbles, values, error) {
        if (marbles.indexOf('^') !== -1) {
            throw new Error('cold observable cannot have subscription offset "^"');
        }
        if (marbles.indexOf('!') !== -1) {
            throw new Error('cold observable cannot have unsubscription marker "!"');
        }
        var messages = TestScheduler.parseMarbles(marbles, values, error);
        var cold = new ColdObservable(messages, this);
        this.coldObservables.push(cold);
        return cold;
    };
    TestScheduler.prototype.createHotObservable = function createHotObservable (marbles, values, error) {
        if (marbles.indexOf('!') !== -1) {
            throw new Error('hot observable cannot have unsubscription marker "!"');
        }
        var messages = TestScheduler.parseMarbles(marbles, values, error);
        var subject = new HotObservable(messages, this);
        this.hotObservables.push(subject);
        return subject;
    };
    TestScheduler.prototype.materializeInnerObservable = function materializeInnerObservable (observable, outerFrame) {
        var this$1 = this;

        var messages = [];
        observable.subscribe(function (value) {
            messages.push({ frame: this$1.frame - outerFrame, notification: Notification.createNext(value) });
        }, function (err) {
            messages.push({ frame: this$1.frame - outerFrame, notification: Notification.createError(err) });
        }, function () {
            messages.push({ frame: this$1.frame - outerFrame, notification: Notification.createComplete() });
        });
        return messages;
    };
    TestScheduler.prototype.expectObservable = function expectObservable (observable, unsubscriptionMarbles) {
        var this$1 = this;
        if ( unsubscriptionMarbles === void 0 ) unsubscriptionMarbles = null;

        var actual = [];
        var flushTest = { actual: actual, ready: false };
        var unsubscriptionFrame = TestScheduler
            .parseMarblesAsSubscriptions(unsubscriptionMarbles).unsubscribedFrame;
        var subscription;
        this.schedule(function () {
            subscription = observable.subscribe(function (x) {
                var value = x;
                // Support Observable-of-Observables
                if (x instanceof Observable) {
                    value = this$1.materializeInnerObservable(value, this$1.frame);
                }
                actual.push({ frame: this$1.frame, notification: Notification.createNext(value) });
            }, function (err) {
                actual.push({ frame: this$1.frame, notification: Notification.createError(err) });
            }, function () {
                actual.push({ frame: this$1.frame, notification: Notification.createComplete() });
            });
        }, 0);
        if (unsubscriptionFrame !== Number.POSITIVE_INFINITY) {
            this.schedule(function () { return subscription.unsubscribe(); }, unsubscriptionFrame);
        }
        this.flushTests.push(flushTest);
        return {
            toBe: function toBe(marbles, values, errorValue) {
                flushTest.ready = true;
                flushTest.expected = TestScheduler.parseMarbles(marbles, values, errorValue, true);
            }
        };
    };
    TestScheduler.prototype.expectSubscriptions = function expectSubscriptions (actualSubscriptionLogs) {
        var flushTest = { actual: actualSubscriptionLogs, ready: false };
        this.flushTests.push(flushTest);
        return {
            toBe: function toBe(marbles) {
                var marblesArray = (typeof marbles === 'string') ? [marbles] : marbles;
                flushTest.ready = true;
                flushTest.expected = marblesArray.map(function (marbles) { return TestScheduler.parseMarblesAsSubscriptions(marbles); });
            }
        };
    };
    TestScheduler.prototype.flush = function flush () {
        var this$1 = this;

        var hotObservables = this.hotObservables;
        while (hotObservables.length > 0) {
            hotObservables.shift().setup();
        }
        VirtualTimeScheduler$$1.prototype.flush.call(this);
        var readyFlushTests = this.flushTests.filter(function (test) { return test.ready; });
        while (readyFlushTests.length > 0) {
            var test = readyFlushTests.shift();
            this$1.assertDeepEqual(test.actual, test.expected);
        }
    };
    TestScheduler.parseMarblesAsSubscriptions = function parseMarblesAsSubscriptions (marbles) {
        var this$1 = this;

        if (typeof marbles !== 'string') {
            return new SubscriptionLog(Number.POSITIVE_INFINITY);
        }
        var len = marbles.length;
        var groupStart = -1;
        var subscriptionFrame = Number.POSITIVE_INFINITY;
        var unsubscriptionFrame = Number.POSITIVE_INFINITY;
        for (var i = 0; i < len; i++) {
            var frame = i * this$1.frameTimeFactor;
            var c = marbles[i];
            switch (c) {
                case '-':
                case ' ':
                    break;
                case '(':
                    groupStart = frame;
                    break;
                case ')':
                    groupStart = -1;
                    break;
                case '^':
                    if (subscriptionFrame !== Number.POSITIVE_INFINITY) {
                        throw new Error('found a second subscription point \'^\' in a ' +
                            'subscription marble diagram. There can only be one.');
                    }
                    subscriptionFrame = groupStart > -1 ? groupStart : frame;
                    break;
                case '!':
                    if (unsubscriptionFrame !== Number.POSITIVE_INFINITY) {
                        throw new Error('found a second subscription point \'^\' in a ' +
                            'subscription marble diagram. There can only be one.');
                    }
                    unsubscriptionFrame = groupStart > -1 ? groupStart : frame;
                    break;
                default:
                    throw new Error('there can only be \'^\' and \'!\' markers in a ' +
                        'subscription marble diagram. Found instead \'' + c + '\'.');
            }
        }
        if (unsubscriptionFrame < 0) {
            return new SubscriptionLog(subscriptionFrame);
        }
        else {
            return new SubscriptionLog(subscriptionFrame, unsubscriptionFrame);
        }
    };
    TestScheduler.parseMarbles = function parseMarbles (marbles, values, errorValue, materializeInnerObservables) {
        var this$1 = this;
        if ( materializeInnerObservables === void 0 ) materializeInnerObservables = false;

        if (marbles.indexOf('!') !== -1) {
            throw new Error('conventional marble diagrams cannot have the ' +
                'unsubscription marker "!"');
        }
        var len = marbles.length;
        var testMessages = [];
        var subIndex = marbles.indexOf('^');
        var frameOffset = subIndex === -1 ? 0 : (subIndex * -this.frameTimeFactor);
        var getValue = typeof values !== 'object' ?
                function (x) { return x; } :
                function (x) {
                // Support Observable-of-Observables
                if (materializeInnerObservables && values[x] instanceof ColdObservable) {
                    return values[x].messages;
                }
                return values[x];
            };
        var groupStart = -1;
        for (var i = 0; i < len; i++) {
            var frame = i * this$1.frameTimeFactor + frameOffset;
            var notification = (void 0);
            var c = marbles[i];
            switch (c) {
                case '-':
                case ' ':
                    break;
                case '(':
                    groupStart = frame;
                    break;
                case ')':
                    groupStart = -1;
                    break;
                case '|':
                    notification = Notification.createComplete();
                    break;
                case '^':
                    break;
                case '#':
                    notification = Notification.createError(errorValue || 'error');
                    break;
                default:
                    notification = Notification.createNext(getValue(c));
                    break;
            }
            if (notification) {
                testMessages.push({ frame: groupStart > -1 ? groupStart : frame, notification: notification });
            }
        }
        return testMessages;
    };

    return TestScheduler;
}(VirtualTimeScheduler));

var RequestAnimationFrameDefinition = function RequestAnimationFrameDefinition(root$$1) {
    if (root$$1.requestAnimationFrame) {
        this.cancelAnimationFrame = root$$1.cancelAnimationFrame.bind(root$$1);
        this.requestAnimationFrame = root$$1.requestAnimationFrame.bind(root$$1);
    }
    else if (root$$1.mozRequestAnimationFrame) {
        this.cancelAnimationFrame = root$$1.mozCancelAnimationFrame.bind(root$$1);
        this.requestAnimationFrame = root$$1.mozRequestAnimationFrame.bind(root$$1);
    }
    else if (root$$1.webkitRequestAnimationFrame) {
        this.cancelAnimationFrame = root$$1.webkitCancelAnimationFrame.bind(root$$1);
        this.requestAnimationFrame = root$$1.webkitRequestAnimationFrame.bind(root$$1);
    }
    else if (root$$1.msRequestAnimationFrame) {
        this.cancelAnimationFrame = root$$1.msCancelAnimationFrame.bind(root$$1);
        this.requestAnimationFrame = root$$1.msRequestAnimationFrame.bind(root$$1);
    }
    else if (root$$1.oRequestAnimationFrame) {
        this.cancelAnimationFrame = root$$1.oCancelAnimationFrame.bind(root$$1);
        this.requestAnimationFrame = root$$1.oRequestAnimationFrame.bind(root$$1);
    }
    else {
        this.cancelAnimationFrame = root$$1.clearTimeout.bind(root$$1);
        this.requestAnimationFrame = function (cb) { return root$$1.setTimeout(cb, 1000 / 60); };
    }
};
var AnimationFrame = new RequestAnimationFrameDefinition(root);

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
var AnimationFrameAction = (function (AsyncAction$$1) {
    function AnimationFrameAction(scheduler, work) {
        AsyncAction$$1.call(this, scheduler, work);
        this.scheduler = scheduler;
        this.work = work;
    }

    if ( AsyncAction$$1 ) AnimationFrameAction.__proto__ = AsyncAction$$1;
    AnimationFrameAction.prototype = Object.create( AsyncAction$$1 && AsyncAction$$1.prototype );
    AnimationFrameAction.prototype.constructor = AnimationFrameAction;
    AnimationFrameAction.prototype.requestAsyncId = function requestAsyncId (scheduler, id, delay) {
        if ( delay === void 0 ) delay = 0;

        // If delay is greater than 0, request as an async action.
        if (delay !== null && delay > 0) {
            return AsyncAction$$1.prototype.requestAsyncId.call(this, scheduler, id, delay);
        }
        // Push the action to the end of the scheduler queue.
        scheduler.actions.push(this);
        // If an animation frame has already been requested, don't request another
        // one. If an animation frame hasn't been requested yet, request one. Return
        // the current animation frame request id.
        return scheduler.scheduled || (scheduler.scheduled = AnimationFrame.requestAnimationFrame(scheduler.flush.bind(scheduler, null)));
    };
    AnimationFrameAction.prototype.recycleAsyncId = function recycleAsyncId (scheduler, id, delay) {
        if ( delay === void 0 ) delay = 0;

        // If delay exists and is greater than 0, recycle as an async action.
        if (delay !== null && delay > 0) {
            return AsyncAction$$1.prototype.recycleAsyncId.call(this, scheduler, id, delay);
        }
        // If the scheduler queue is empty, cancel the requested animation frame and
        // set the scheduled flag to undefined so the next AnimationFrameAction will
        // request its own.
        if (scheduler.actions.length === 0) {
            AnimationFrame.cancelAnimationFrame(id);
            scheduler.scheduled = undefined;
        }
        // Return undefined so the action knows to request a new async id if it's rescheduled.
        return undefined;
    };

    return AnimationFrameAction;
}(AsyncAction));

var AnimationFrameScheduler = (function (AsyncScheduler$$1) {
    function AnimationFrameScheduler () {
        AsyncScheduler$$1.apply(this, arguments);
    }

    if ( AsyncScheduler$$1 ) AnimationFrameScheduler.__proto__ = AsyncScheduler$$1;
    AnimationFrameScheduler.prototype = Object.create( AsyncScheduler$$1 && AsyncScheduler$$1.prototype );
    AnimationFrameScheduler.prototype.constructor = AnimationFrameScheduler;

    AnimationFrameScheduler.prototype.flush = function flush () {
        this.active = true;
        this.scheduled = undefined;
        var ref = this;
        var actions = ref.actions;
        var error;
        var index = -1;
        var count = actions.length;
        var action = actions.shift();
        do {
            if (error = action.execute(action.state, action.delay)) {
                break;
            }
        } while (++index < count && (action = actions.shift()));
        this.active = false;
        if (error) {
            while (++index < count && (action = actions.shift())) {
                action.unsubscribe();
            }
            throw error;
        }
    };

    return AnimationFrameScheduler;
}(AsyncScheduler));

var animationFrame = new AnimationFrameScheduler(AnimationFrameAction);

/* tslint:disable:no-unused-variable */
// Subject imported before Observable to bypass circular dependency issue since
// Subject extends Observable and Observable references Subject in it's
// definition

Object.defineProperty(Component$1.prototype, 'implColor', {
    get: function () {
        if(_.isUndefined(this._implColor)) {
            var implementations =
                _.chain(this.options.data)
                .groupBy(function (obj) { return obj.impl; })
                .keys()
                .value();

            var hueScale =
                d3.scalePoint()
                .domain(implementations)
                .range([0, 300]);
            this._implColor = function (key) { return d3.hsl(hueScale(key), 0.5, 0.5); };
        }
        return this._implColor
    }
});

function Component$1(options) {
    this.name = 'Controls';
    this.options = options;
    this.init();
    this.setStateHandler$();
}

Component$1.prototype.init = function() {
    var this$1 = this;

    this.container = this.options.container.append('div').attr('class', this.name);

    var panel =
        this.container.selectAll('.panel')
        .data(
            _.map(['impl', 'digits', 'command'], function (key) { return ({
                    key: key,
                    values: _.chain(this$1.options.data)
                        .groupBy(key)
                        .keys()
                        .map(function (value) { return ({
                            key: key,
                            value: key === 'digits'
                                ? value === 'null'
                                    ? null
                                    : parseInt(value, 10)
                                : value
                        }); })
                        .value()
                }); }
            ),
            function (d) { return d.key; }
        );

    panel.exit().remove();

    var panelEnter =
        panel.enter()
        .append('div')
        .attr('class', 'panel');

    panelEnter
        .append('p')
        .attr('class', 'title')
        .text(function (d) { return ({
            impl: 'Implementation',
            digits: 'Digits',
            command: 'Command'
        }[d.key]); });

    this.valueDiv =
        panelEnter
        .selectAll('.row')
        .data(function (d) { return d.values; });

    var valueEnter =
        this.valueDiv.enter()
        .append('div')
        .attr('class', 'row');

    valueEnter
        .filter(function (d) { return d.key === 'impl'; })
        .append('div')
        .attr('class', 'dot')
        .style('background-color', function (d) {
            return d.key === 'impl' ? this$1.implColor(d.value) : null
        });

    valueEnter
        .append('div')
        .attr('class', 'value')
        .append('p')
        .text(function (d) {
            var value;
            switch (d.key) {
                case 'impl': {
                    var d_value = d.value.split('.').slice(1).join('.');
                    switch (d_value) {
                        case 'current.path':
                        case 'withFormat.path':
                            value = d_value + " ( null )";
                            break;
                        case 'withIf.path':
                            value = d_value + " ( null | digits )";
                            break;
                        case 'withFormat.pathRound':
                        case 'withFormat.pathCoerceFixed':
                        case 'withFormat.pathFixed':
                        case 'withFormat.pathCoerceRound':
                            value = d_value + " ( digits )";
                            break;
                        default:
                            break;
                    }
                    break;
                }
                default:
                    value = String(d.value);
            }
            return value
            // return _.isNull(d.value) ? 'null' : d.value
        });

    this.valueDiv = this.valueDiv.merge(valueEnter);

    /* mini legend */

    var legend = this.container.append('div').attr('class', 'legend');

    legend
    .append('div').attr('class', 'dot')
    .append('p').text('N');

    legend
    .append('div').attr('class', 'phrase')
    .append('p')
    .text('N = log10(calls)');
};

Component$1.prototype.getStateHandler$ = function() {
    return this.stateHandler$
};

Component$1.prototype.setStateHandler$ = function() {
    this.stateHandler$ = Observable.merge.apply(
        Observable, _.chain(this.valueDiv.nodes())
        .map(function (node) { return [
            Observable.fromEvent(node, 'mouseover')
            .map(function () { return function (state) {
                    var d = _.mapValues(d3.select(node).datum(), function (key) { return String(key); });
                    var update = {};
                    if (!state[d.key][d.value]) {
                        update =
                            _.chain(state)
                            .cloneDeep()
                            .pick(d.key)
                            .mapValues(function (obj) {
                                obj[d.value] = {pinned: false};
                                return obj
                            })
                            .value();
                    }
                    return Object.assign({}, state, update)
                }; }
            ),
            Observable.fromEvent(node, 'click')
            .map(function () { return function (state) {
                    var d = _.mapValues(d3.select(node).datum(), function (key) { return String(key); });
                    var update =
                        _.chain(state)
                        .cloneDeep()
                        .pick(d.key)
                        .mapValues(function (obj) {
                            obj[d.value].pinned = !obj[d.value].pinned;
                            return obj
                            // return Object.assign(obj[d.value], {pinned: !obj[d.value].pinned})
                        })
                        .value();
                    return Object.assign({}, state, update)
                }; }
            ),
            Observable.fromEvent(node, 'mouseout')
            .map(function () { return function (state) {
                    var d = _.mapValues(d3.select(node).datum(), function (key) { return String(key); });
                    var update = {};
                    if (!state[d.key][d.value].pinned) {
                        update =
                            _.chain(state)
                            .cloneDeep()
                            .pick(d.key)
                            .mapValues(function (obj) { return _.omit(obj, d.value); })
                            .value();
                    }
                    return Object.assign({}, state, update)
                }; }
            )
        ]; })
        .flatten()
        .value()
    );
    // .share()
};

Component$1.prototype.subscribeToState = function(state$) {
    var this$1 = this;

    state$.subscribe(function (state) {
        this$1.valueDiv.select('.value')
        .classed('pinned', function (d) { return state[d.key][d.value]
            && state[d.key][d.value].pinned; }
        )
        .classed('hovered', function (d) { return state[d.key][d.value]
            ? !state[d.key][d.value].pinned
            : false; }
        );
    });

};

Component$3.prototype.initAxes = function() {
    this.axes = {
        t: this.g.append('g').attr('class', 'axis x'),
        m: this.g.append('g').attr('class', 'axis y')
    };

    // x labels
    this.tAxisLabel =
        this.axes.t.append('g')
        .append('text')
        .attr('class', 'label');
    this.tAxisLabel.append('tspan').text('Duration');
    this.tAxisLabel.append('tspan').text('[ s ]').attr('dx', '0.5em');

    this.tAxisLabelMin = this.axes.t.append('g');
    this.tAxisLabelMinText =
        this.tAxisLabelMin.append('text').attr('class', 'label min');

    this.tAxisLabelMax = this.axes.t.append('g');
    this.tAxisLabelMaxText =
        this.tAxisLabelMax.append('text').attr('class', 'label max');

    // y labels
    this.mAxisLabel =
        this.axes.m.append('g').attr('class', 'label')
        .append('text');
    this.mAxisLabel.append('tspan').text('Heap');
    this.mAxisLabel.append('tspan').text('[ bytes ]').attr('dx', '0.5em');

    this.mAxisLabelMin = this.axes.m.append('g');
    this.mAxisLabelMinText =
        this.mAxisLabelMin.append('text').attr('class', 'label min');

    this.mAxisLabelMax = this.axes.t.append('g');
    this.mAxisLabelMaxText =
        this.mAxisLabelMax.append('text').attr('class', 'label max');
};

Component$3.prototype.updateAxes = function() {
    /* x */

    this.axes.t
    .attr('transform', ("translate(" + ([0,this.geometry.innerHeight]) + ")"))
    .call(this.generators.axes.t);

    // dots with low memory values might overlap x axis ticks
    this.axes.t.selectAll('.tick text')
        .attr('y', this.geometry.dotRadiusSafety);

    // labels
    this.tAxisLabel
        .attr('transform', ("translate(" + ([
            this.geometry.innerWidth/2,
            0.65 * this.geometry.padding.bottom
        ]) + ")"));

    this.tAxisLabelMin
        .attr('transform', ("translate(" + ([0, 0.65*this.geometry.padding.bottom]) + ")"));
    this.tAxisLabelMinText
        .text(this.data.tExtent[0]
            ? ("|< 1e" + (Math.log10(this.data.tExtent[0]).toFixed(1)))
            : ''
        );

    this.tAxisLabelMax
        .attr('transform', ("translate(" + ([
            this.geometry.innerWidth,
            0.65 * this.geometry.padding.bottom]) + ")")
        );
    this.tAxisLabelMaxText
        .text(this.data.tExtent[1]
            ? ("1e" + (Math.log10(this.data.tExtent[1]).toFixed(1)) + " >|")
            : ''
        );

    /* y */

    this.axes.m
    // .attr('transform', `translate(${[0,this.geometry.innerHeight]})`)
    .call(this.generators.axes.m);

    // dots with low time values might overlap y axis ticks
    this.axes.m.selectAll('.tick text')
    .attr('x', -this.geometry.dotRadiusSafety);

    this.mAxisLabel
        .attr('transform', ("translate(" + ([
            -0.65 * this.geometry.padding.left,
            this.geometry.innerHeight/2
        ]) + ") rotate(-90)"));

    this.mAxisLabelMin
        .attr('transform', ("translate(" + ([
            -0.65 * this.geometry.padding.left,
            this.geometry.innerHeight
        ]) + ") rotate(-90)"));
    this.mAxisLabelMinText
        .text(this.data.mExtent[0]
            ? ("|< 1e" + (Math.log10(this.data.mExtent[0]).toFixed(1)))
            : ''
        );

    this.mAxisLabelMax
        .attr('transform', ("translate(" + ([
            -0.65 * this.geometry.padding.left,
            -this.geometry.innerHeight
        ]) + ") rotate(-90)"));
    this.mAxisLabelMaxText
        .text(this.data.mExtent[1]
            ? ("1e" + (Math.log10(this.data.mExtent[1]).toFixed(1)) + " >|")
            : ''
        );
};

Object.defineProperty(Component$3.prototype, 'implColor', {
    get: function () {
        if(_.isUndefined(this._implColor)) {
            var hueScale =
                d3.scalePoint()
                .domain(this.data.allImplementations)
                .range([0, 300]);
            this._implColor = function (key) { return d3.hsl(hueScale(key), 0.5, 0.5); };
        }
        return this._implColor
    }
});

Component$3.prototype.initCurves = function() {
    this.trends = this.g.append('g').attr('class', 'trends');
    this.curves = this.trends.append('g').attr('class', 'curves');
    this.dots = this.trends.append('g').attr('class', 'dots');
};

Component$3.prototype.updateCurves = function() {
    var this$1 = this;

    /* curves */

    this.curve =
        this.curves.selectAll('.curve')
        .data(this.data.curves, function (d) { return d.id; });
    this.curve.exit().remove();

    var curveEnter = this.curve.enter().append('g').attr('class', 'curve');

    // curve path

    curveEnter.append('path')
    .attr('id', function (d) { return d.domID; })
    .style('stroke', function (d) { return this$1.implColor(d.impl); });

    // curve label

    curveEnter
    .append('text')
    .attr('dy', -this.geometry.dotRadiusSafety)
    .style('fill', function (d) { return this$1.implColor(d.impl); })
    .append('textPath')
    .attr('startOffset', '90%')
    .attr('xlink:href', function (d) { return ("#" + (d.domID)); })
    .text(function (d) { return d.id; });

    this.curve = curveEnter.merge(this.curve);

    // dots with text
    this.dot = this.dots.selectAll('.dot').data(this.data.points);
    this.dot.exit().remove();
    var dotEnter = this.dot.enter().append('g').attr('class', 'dot');

    dotEnter.append('circle');
    dotEnter.append('text')
    .text(function (d) { return Math.log10(d.calls); });

    this.dot = dotEnter.merge(this.dot);
    this.dot.select('circle').style('stroke', function (d) { return this$1.implColor(d.impl); });
    this.dot.select('text').style('fill', function (d) { return this$1.implColor(d.impl); });
};

Component$3.prototype.updateCurvesGeometry = function() {
    var this$1 = this;

    this.curve
    .select('path')
    .attr('d', function (d) {
        return this$1.generators.line(d.points)
    });

    this.dot
    .attr('transform', function (d) { return ("translate(" + ([
        this$1.scales.t(d.duration),
        this$1.scales.m(d.heap)
    ]) + ")"); })
    .select('circle')
    .attr('r', this.geometry.dotRadiusFocusFactor * this.geometry.dotRadius);
};

Component$3.prototype.focusDots = function(focus) {
    var this$1 = this;

    this.dot
    .select('circle')
    .attr('r', function (d) { return (!focus || (d.calls !== focus.calls))
        ? this$1.geometry.dotRadius
        : this$1.geometry.dotRadiusFocused; }
    );

    this.dot
    .select('text')
    .attr('font-size', function (d) { return (!focus || (d.calls !== focus.calls))
        ? null
        : ((this$1.geometry.dotRadiusFocusFactor) + "em"); }
    );
};

Component$3.prototype.connectData = function() {
    var this$1 = this;

    this.options.data$
    .map(function (input) {
        var data = {
            tExtent: d3.extent(input.items, function (obj) { return obj.duration; }),
            mExtent: d3.extent(input.items, function (obj) { return obj.heap; })
        };
        data.curves =
            _.chain(input.items)
            .groupBy(function (obj) { return ((obj.impl.split('.').slice(1).join('.')) + "(" + (obj.digits) + ")." + (obj.command)); })
            .map(function (points, id) { return ({
                id: id,
                domID: id.replace(/[().]/g, '_'),
                impl: points[0].impl,
                points: points
            }); })
            .value();
        data.points =
            _.map(input.items, function (obj) { return _.assign(obj, {
                id: ((obj.impl) + "|" + (obj.digits) + "|" + (obj.command) + "|" + (obj.calls)),
                impl: obj.impl
            }); });
        data.uniquePoints = _.uniqWith(data.points, function (a, b) { return _.isEqual(
                _.pick(a, 'heap', 'duration'),
                _.pick(b, 'heap', 'duration')
            ); }
        );
        data.allImplementations = input.allImplementations;

        return data
    })
    .subscribe(function (data) {
        this$1.data = data;
        this$1.updateScalesData();
        this$1.updateGenerators();
        this$1.updateAxes();
        this$1.updateSensors();
        this$1.updateCurves();
        this$1.updateCurvesGeometry();
    });
};

Component$3.prototype.setEvents = function() {
    var this$1 = this;

    // internal events
    this.dispatch =
        d3.dispatch('focus_changed')
        .on('focus_changed', function (obj) {this$1.focusDots(obj);});

    // window events
    Observable.fromEvent(window, 'resize')
    // .debounceTime(20)
    .subscribe(function () {
        this$1.geometry.dirty = true;
        this$1.resize();
    });
};

Component$3.prototype.initGenerators = function() {
    var this$1 = this;

    this.generators = {
        axes: {
            t: d3.axisBottom(),
            m: d3.axisLeft()
        },
        line: d3.line()
            .curve(d3.curveNatural)
            .x(function (d) { return this$1.scales.t(d.duration); })
            .y(function (d) { return this$1.scales.m(d.heap); }),
        voronoi: d3.voronoi()
            .x(function (d) { return this$1.scales.t(d.duration); })
            .y(function (d) { return this$1.scales.m(d.heap); })
    };
};

Component$3.prototype.updateGenerators = function() {
    this.generators.axes.t
        .scale(this.scales.t)
        .tickSize(-this.geometry.innerHeight);

    this.generators.axes.m
        .scale(this.scales.m)
        .tickSize(-this.geometry.innerWidth);

    this.generators.voronoi.extent(this.geometry.extent);
};

var element_get_geometry = function(elem, additionalProps) {
    var inspectedProps = ['width', 'height'];
    if (!_.isUndefined(additionalProps)) {
        inspectedProps = inspectedProps.concat(additionalProps);
    }
    return _.chain(getComputedStyle(elem))
        .pick(inspectedProps)
        .mapValues(function(pxValue) { return parseFloat(pxValue, 10); })
        .value()
};

Object.defineProperty(Component$3.prototype, 'geometry', {
    get: function () {
        var this$1 = this;

        if(!this._geometry) {
            this._geometry = {
                dirty: true,
                padding: {top: 20, right: 20, bottom: 60, left: 80},
                fontSize: element_get_geometry(this.container.node(),
                    ['fontSize']
                ).fontSize
            };
            this._geometry.dotRadius = 0.55 * this._geometry.fontSize;
            this._geometry.dotRadiusSafety = 1.3 * this._geometry.dotRadius;
            this._geometry.dotRadiusFocusFactor = 1.5;
            this._geometry.dotRadiusFocused =
                this._geometry.dotRadiusFocusFactor * this._geometry.dotRadius;

            this._geometry.padding = _.mapValues(this._geometry.padding, function (n) { return Math.max(n, this$1._geometry.dotRadiusFocused); }
            );
            this._geometry.origin = [
                this.geometry.padding.left,
                this.geometry.padding.top ];
        }

        if (this._geometry.dirty) {
            // container
            this._geometry.container = element_get_geometry(
                this.container.node(), [
                    'paddingBottom',
                    'paddingLeft',
                    'paddingRight',
                    'paddingTop'
                ]
            );

            // x
            this._geometry.width =
                this._geometry.container.width
                - this._geometry.container.paddingLeft
                - this._geometry.container.paddingRight;
            this._geometry.innerWidth =
                this._geometry.width
                - this._geometry.padding.left
                - this._geometry.padding.right;

            // y
            this._geometry.height =
                this._geometry.container.height
                - this._geometry.container.paddingTop
                - this._geometry.container.paddingBottom;
            this._geometry.innerHeight =
                this._geometry.height
                - this._geometry.padding.top
                - this._geometry.padding.bottom;

            this._geometry.extent = [
                [0, 0],
                [this._geometry.innerWidth, this._geometry.innerHeight]
            ];

            this._geometry.dirty = false;
        }

        return this._geometry
    }
});

Component$3.prototype.resize = function() {
    this.updateScalesGeometry();
    this.updateGenerators();
    this.updateSkeletonGeometry();
    this.updateAxes();
    this.updateCurvesGeometry();
    this.updateSensors();
};

Component$3.prototype.initScales = function() {
    this.scales = {
        t: d3.scaleLog(),
        m: d3.scaleLog()
    };
};

Component$3.prototype.updateScalesData = function() {
    this.scales.t.domain(this.data.tExtent);
    this.scales.m.domain(this.data.mExtent);
};

Component$3.prototype.updateScalesGeometry = function() {
    this.scales.t.range([0, this.geometry.innerWidth]);
    this.scales.m.range([this.geometry.innerHeight, 0]);
};

Component$3.prototype.initSkeleton = function() {
    this.container =
        this.options.container.append('div')
        .attr('class', this.name);
    this.svg = this.container.append('svg');
    this.g = this.svg.append('g');
};

Component$3.prototype.updateSkeletonGeometry = function() {
    this.svg
        .attr('width', this.geometry.width)
        .attr('height', this.geometry.height);

    this.g
        .attr('transform', ("translate(" + (this.geometry.origin) + ")"));
};

Component$3.prototype.initSensors = function() {
    this.sensors = this.g.append('g').attr('class', 'sensors');
};

Component$3.prototype.updateSensors = function() {
    var this$1 = this;

    var polygons =
        this.generators.voronoi.polygons(this.data.uniquePoints);

    var sensor =
        this.sensors.selectAll('.sensor').data(polygons);

    sensor.exit().remove();
    sensor.enter()
        .append('path')
        .attr('class', 'sensor')
        .on('mouseover', function (d) { this$1.dispatch.call('focus_changed', this$1, d.data); })
        .on('mouseout', function () { this$1.dispatch.call('focus_changed', this$1, null); })
        .merge(sensor)
        .attr('d', function (d) { return 'M' + d.join('L') + 'Z'; });
};

function Component$3(options) {
    this.name = 'Chart';
    this.options = options;

    this.initSkeleton();
    this.updateSkeletonGeometry();

    this.initScales();
    this.updateScalesGeometry();

    this.initGenerators();
    this.initAxes();
    this.initSensors();
    this.initCurves();

    this.connectData();
    this.setEvents();
}

App$1.prototype.setSkeleton = function() {
    var appdiv = d3.select(this.options.container).append('div').attr('class', 'app');
    appdiv.append('div').attr('id', 'Chart');
    appdiv.append('div').attr('id', 'Controls');
};

function App$1(options) {
    this.options = options;
    this.setSkeleton();
    this.load();
}

App$1.prototype.load = function() {
    var this$1 = this;

    this.data$ = Observable.bindNodeCallback(d3.json)('data/path.json');
    this.data$.subscribe(function (data) {
        this$1.controls = new Component$1({
            container: d3.select('#Controls'),
            data: data
        });
        this$1.initState();
        this$1.setStateLoopbacks();
        this$1.initChart();
    });
};

App$1.prototype.initState = function() {
    this.state$ =
        this.controls.getStateHandler$()
        .startWith({
            impl: {
                'path.current.path': {pinned: true},
                'path.withIf.path': {pinned: true},
                'path.withFormat.path': {pinned: true},
                // 'path.withFormat.pathRound': {pinned: true}
            },
            digits: {
                null: {pinned: true},
                // 5: {pinned: true}
            },
            command: {
                moveTo: {pinned: true},
                // lineTo: {pinned: true},
                // quadraticCurveTo: {pinned: true},
                // rect: {pinned: true},
                // bezierCurveTo: {pinned: true},
                // arcTo: {pinned: true},
                // arc: {pinned: true}
            }
        })
        .scan(function (state, handler) { return handler(state); });
        // .share()
};

App$1.prototype.setStateLoopbacks = function() {
    this.controls.subscribeToState(this.state$);
};

App$1.prototype.initChart = function() {
    new Component$3({
        container: d3.select('#Chart'),
        data$: Observable.combineLatest(this.state$, this.data$, function (state, data) {
            var items = data;
            _.each(state, function (dimObj, dimension) {
                var values = _.keys(dimObj);
                if (dimension === 'digits') {
                    values = _.map(values, function (s) { return s === 'null' ? null : parseInt(s, 10); }
                    );
                }
                items = _.filter(items, function (obj) {
                    return _.includes(values, obj[dimension])
                });
            });
            return {
                items: items,
                allImplementations: _.keys(_.groupBy(data, function (obj) { return obj.impl; }))
            }
        })
        .distinctUntilChanged(function (a, b) { return _.isEqual(a,b); })

        // FIXME fires 2 times as combineLatest subscribe to state$
        // as the chart does, but chaining `.share()` to `this.state$` won't
        // draw the curves until we mouseover the options in the control panel..
    });
};

new App$1({container: 'body'});

}(d3,_));
