const benchmark = require('benchmark');
const aevum = require('../aevum');

// Difference between AOT and JIT tokenizing
(function(suite) {
    const formatString = '(h)[h:](m)[m:](s)[s:](d)[ddd]';
    const data = {
        hours: 1,
        minutes: 23,
        seconds: 45,
        milliseconds: 678,
    };
    const format = new aevum.Aevum(formatString);

    suite.add('aot', function() {
        format.format(data);
    })
    .add('jit', function() {
        const tmp = new aevum.Aevum(formatString);
        tmp.format(data);
    })
    .run();
})(new benchmark.Suite('Aevum#format: Tokenizing', {
    onCycle: cycleHandler,
    onComplete: completeHandler,
}));

// Difference between timestamp and object times
(function(suite) {
    const instance = new aevum.Aevum('[h]:[mm]:[ss].[ddd]');

    suite.add('timestamp', function() {
        instance.format(4926678);
    })
    .add('time-object', function() {
        instance.format({
            hours: 1,
            minutes: 23,
            seconds: 45,
            milliseconds: 678,
        });
    })
    .run();
})(new benchmark.Suite('Aevum#format: Timeing', {
    onCycle: cycleHandler,
    onComplete: completeHandler,
}));

function cycleHandler(event) {
    console.log(String(event.target));
}

function completeHandler() {
    console.log('>> Fastest is ' + this.filter('fastest').map('name'));
}
