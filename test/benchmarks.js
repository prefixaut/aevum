const benchmark = require('benchmark');
const chalk = require('chalk');
const aevum = require('../dist');

// Difference between AOT and JIT tokenizing
(function(suite) {
    const formatString = '(h:#:)(m:#:)(s:#:)(d:ddd)';
    const data = {
        hours: 1,
        minutes: 23,
        seconds: 45,
        milliseconds: 678,
    };
    const format = new aevum.Aevum(formatString);

    suite.add('aot', function() {
        format.format(data);
    }).add('jit', function() {
        const tmp = new aevum.Aevum(formatString);
        tmp.format(data);
    })
    .run();
})(new benchmark.Suite('Aevum#format: AOT vs JIT', {
    onStart: startHandler,
    onCycle: cycleHandler,
    onComplete: completeHandler,
}));

// Difference between timestamp and object times
(function(suite) {
    const instance = new aevum.Aevum('[h]:[mm]:[ss].[ddd]');

    suite.add('timestamp', function() {
        instance.format(4926678);
    }).add('time-object', function() {
        instance.format({
            hours: 1,
            minutes: 23,
            seconds: 45,
            milliseconds: 678,
        });
    })
    .run();
})(new benchmark.Suite('Aevum#format: Timestamp vs Time-Object', {
    onStart: startHandler,
    onCycle: cycleHandler,
    onComplete: completeHandler,
}));

// Differnce between formatting with options
(function(suite) {
    const instance = new aevum.Aevum('[h]:[mm]:[ss].[ddd]');
    const time = {
        hours: 1,
        minutes: 1,
        seconds: 1,
        milliseconds: 1,
    };

    suite.add('padding, expand', function() {
        instance.format(time, { padding: true, expand: true });
    }).add('padding only', function() {
        instance.format(time, { padding: true, expand: false });
    }).add('expand only', function() {
        instance.format(time, { padding: false, expand: true });
    }).add('none', function() {
        instance.format(time, { padding: false, expand: false });
    }).run();
})(new benchmark.Suite('Aevum#format: Un-Safe vs Safe', {
    onStart: startHandler,
    onCycle: cycleHandler,
    onComplete: completeHandler,
}));

function startHandler(event) {
    console.log(chalk.bold.italic.green(event.currentTarget.name));
}

function cycleHandler(event) {
    console.log(chalk.yellow(String(event.target)));
}

function completeHandler() {
    console.log(chalk.green('>> Fastest is: ') + chalk.green.bold(this.filter('fastest').map('name')) + '\n');
}
