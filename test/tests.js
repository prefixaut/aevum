const chai = require('chai');
const expect = chai.expect;

const Aevum = require('../dist').Aevum;

function testWithSettings(settings) {
    const instance = new Aevum(settings.format);
    expect(
        instance.format(settings.time, settings.options),
        `test with settings: ${JSON.stringify(settings)}`
    ).to.be.equal(settings.output);
}

describe('aevum constructor', function() {
    it('should be a function', function() {
        expect(Aevum).to.be.a('function');
    });
});

describe('aevum.format', function() {
    it('should compile', function() {
        [
            '[d]',
            '[dd]',
            '[ddd]',
            '[s]',
            '[ss]',
            '[m]',
            '[mm]',
            '[h]',
            '[hh]',
            'hello',
            '(d:content)',
            '(d:other[mm]content)',
            'hello\\[world]',
            '(d:hello\\[world])',
            '(+)',
            '(-)',
            '[?]',
            'something(d:here)'
        ].forEach(function(format) {
            expect(function() {
                new Aevum(format);
            }).to.not.throw(SyntaxError);
        });
    });

    it('should throw syntax errors', function() {
        [
            '(should-fail)',
            '(db)',
            '(h\\hh:test)',
            '(dd',
            '(dd:',
            '(:cool)',
            'there()is content',
            '(ab)',
            '(mm:[[ss]])',
            '(mm)[[invalid]]',
            '(mm)[[test]',
            '[dddd]',
            '[d4]',
            '[sss]',
            '[s3]',
            '[mmm]',
            '[m3]',
            '[a]',
            '[b]',
            '[c]',
            '[e]',
            '[f]',
            '[g]',
            '[k]',
            '[l]',
            '[n]',
            '[o]',
            '[p]',
            '[q]',
            '[r]',
            '[t]',
            '[u]',
            '[v]',
            '[x]',
            '[y]',
            '[z]',
            '[]',
            '[+]',
            '[-]',
            '(?)',
            '(++)',
            '(--)',
            '[??]',
            '(d:bla[])',
            '[da]',
            '[sa]',
            '[ma]',
            '[ha]',
            '[d500]',
            '[dd34]',
            '[d24de]',
            '(d:(m:something))',
            '[[da]]',
            '[[sa]]',
            '[[ma]]',
            '[[ha]]'
        ].forEach(function(format) {
            expect(function() {
                new Aevum(format);
            }, `expected ${format} to throw an error`).to.throw(SyntaxError);
        });
    });

    it('should be an object', function() {
        expect(new Aevum('something')).to.be.a('object');
    });

    it('should have a format function', function() {
        expect(new Aevum('something'))
            .to.have.property('format')
            .and.to.be.an('function');
    });

    it('should render inbetween strings', function() {
        testWithSettings({
            format: 'hi-[d]-welcome-[d]-to-[d]-somewhere',
            time: 1,
            output: 'hi-1-welcome-1-to-1-somewhere'
        });
    });

    it('should format correctly', function() {
        [
            {
                tokenType: 's',
                timeType: 'seconds',
                empty: [0, {}, 999, { milliseconds: 999 }, { seconds: 0 }],
                filled: [1000, { seconds: 1 }, { minutes: 1 }, { hours: 1 }]
            },
            {
                tokenType: 'm',
                timeType: 'minutes',
                empty: [0, {}, 59999, { milliseconds: 999 }, { seconds: 59 }],
                filled: [60000, { minutes: 1 }, { hours: 1 }]
            },
            {
                tokenType: 'h',
                timeType: 'hours',
                empty: [
                    0,
                    {},
                    3599999,
                    { milliseconds: 999 },
                    { seconds: 59 },
                    { minutes: 59 }
                ],
                filled: [3600000, { hours: 1 }]
            }
        ].forEach(function(obj) {
            const format = `(${obj.tokenType}:test)`;

            obj.empty.forEach(function(time) {
                testWithSettings({ format, time, output: '' });
            });

            obj.filled.forEach(function(time) {
                testWithSettings({
                    format,
                    time,
                    output: 'test'
                });
            });
        });
    });

    it('should format expansions correctly', function() {
        [
            {
                format: '[d]',
                time: { milliseconds: 123 },
                options: { expand: false },
                output: '1'
            },
            {
                format: '[d]',
                time: { milliseconds: 123 },
                options: { expand: true },
                output: '123'
            },
            {
                format: '[d]',
                time: { milliseconds: 12 },
                options: { expand: true },
                output: '12'
            },
            {
                format: '[s]',
                time: { seconds: 12 },
                options: { expand: false },
                output: '1'
            },
            {
                format: '[s]',
                time: { seconds: 12 },
                options: { expand: true },
                output: '12'
            },
            {
                format: '[m]',
                time: { minutes: 12 },
                options: { expand: false },
                output: '1'
            },
            {
                format: '[m]',
                time: { minutes: 12 },
                options: { expand: true },
                output: '12'
            },
            {
                format: '[h]',
                time: { hours: 12 },
                options: { expand: false },
                output: '1'
            },
            {
                format: '[h]',
                time: { hours: 12 },
                options: { expand: true },
                output: '12'
            },
            {
                format: '[h]',
                time: { hours: 123 },
                options: { expand: true },
                output: '123'
            }
        ].forEach(testWithSettings);
    });

    it('should format padding correctly', function() {
        [
            {
                format: '(s:[d])',
                time: { seconds: 1 },
                withPadding: '000',
                withoutPadding: '0'
            },
            {
                format: '(m:[d])',
                time: { minutes: 1 },
                withPadding: '000',
                withoutPadding: '0'
            },
            {
                format: '(m:[s])',
                time: { minutes: 1 },
                withPadding: '00',
                withoutPadding: '0'
            },
            {
                format: '(h:[d])',
                time: { hours: 1 },
                withPadding: '000',
                withoutPadding: '0'
            },
            {
                format: '(h:[s])',
                time: { hours: 1 },
                withPadding: '00',
                withoutPadding: '0'
            },
            {
                format: '(h:[m])',
                time: { hours: 1 },
                withPadding: '00',
                withoutPadding: '0'
            }
        ].forEach(settings => {
            testWithSettings({
                format: settings.format,
                time: settings.time,
                options: { padding: true },
                output: settings.withPadding
            });
            testWithSettings({
                format: settings.format,
                time: settings.time,
                options: { padding: false },
                output: settings.withoutPadding
            });
        });
    });

    it('should render the length correctly', function() {
        [
            {
                format: '[hh]',
                time: { hours: 1 },
                output: '01'
            },
            {
                format: '[h]',
                time: { hours: 1 },
                output: '1'
            },
            {
                format: '[mm]',
                time: { minutes: 1 },
                output: '01'
            },
            {
                format: '[m]',
                time: { minutes: 1 },
                output: '1'
            },
            {
                format: '[ss]',
                time: { seconds: 1 },
                output: '01'
            },
            {
                format: '[s]',
                time: { seconds: 1 },
                output: '1'
            },
            {
                format: '[ddd]',
                time: { milliseconds: 1 },
                output: '001'
            },
            {
                format: '[dd]',
                time: { milliseconds: 1 },
                output: '01'
            },
            {
                format: '[d]',
                time: { milliseconds: 1 },
                output: '1'
            }
        ].forEach(testWithSettings);
    });

    it('should render the hash correctly', function() {
        [
            {
                format: '(d:foo-#-bar)',
                time: { milliseconds: 1 },
                output: 'foo-1-bar',
            },
            {
                format: '(d:foo-#-bar)',
                time: { milliseconds: 123 },
                output: 'foo-123-bar',
            },
            {
                format: '(ddd:foo-#-bar)',
                time: { milliseconds: 1 },
                output: 'foo-001-bar',
            },
            {
                format: '(ddd:foo-#-bar)',
                time: { milliseconds: 123 },
                output: 'foo-123-bar',
            },
            {
                format: '(s:foo-#-bar)',
                time: { seconds: 1 },
                output: 'foo-1-bar',
            },
            {
                format: '(s:foo-#-bar)',
                time: { seconds: 12 },
                output: 'foo-12-bar',
            },
            {
                format: '(ss:foo-#-bar)',
                time: { seconds: 1 },
                output: 'foo-01-bar',
            },
            {
                format: '(ss:foo-#-bar)',
                time: { seconds: 12 },
                output: 'foo-12-bar',
            },
            {
                format: '(m:foo-#-bar)',
                time: { minutes: 1 },
                output: 'foo-1-bar',
            },
            {
                format: '(m:foo-#-bar)',
                time: { minutes: 12 },
                output: 'foo-12-bar',
            },
            {
                format: '(mm:foo-#-bar)',
                time: { minutes: 1 },
                output: 'foo-01-bar',
            },
            {
                format: '(mm:foo-#-bar)',
                time: { minutes: 12 },
                output: 'foo-12-bar',
            },
            {
                format: '(h:foo-#-bar)',
                time: { hours: 1 },
                output: 'foo-1-bar',
            },
            {
                format: '(h:foo-#-bar)',
                time: { hours: 12 },
                output: 'foo-12-bar',
            },
            {
                format: '(hh:foo-#-bar)',
                time: { hours: 1 },
                output: 'foo-01-bar',
            },
            {
                format: '(hh:foo-#-bar)',
                time: { hours: 12 },
                output: 'foo-12-bar',
            },
        ].forEach(testWithSettings);
    });

    it('should format timing-indicators correctly', function() {
        const minus = new Aevum('(-)[d]');
        expect(minus.format(-1)).to.be.equal('-1');
        expect(minus.format(1)).to.be.equal('1');

        const plus = new Aevum('(+)[d]');
        expect(plus.format(1)).to.be.equal('+1');
        expect(plus.format(-1)).to.be.equal('1');

        const both = new Aevum('[?][d]');
        expect(both.format(1)).to.be.equal('+1');
        expect(both.format(-1)).to.be.equal('-1');
    });

    it('should throw time errors', function() {
        const instance = new Aevum('something');
        [
            undefined,
            null,
            'test',
            NaN,
            Infinity,
            -NaN,
            -Infinity,
            true,
            false
        ].forEach(function(invalid) {
            expect(function() {
                instance.format(invalid);
            }, `element '${invalid}' to be invalid`).to.throw(TypeError);
        });
    });

    it('should truncate decimals', function() {
        const instance = new Aevum('(-)[d]');
        expect(instance.format(0.1234), `zero should be positive`).to.be.equal(
            '0'
        );
        expect(instance.format(1.1234), `one should be positive`).to.be.equal(
            '1'
        );
        expect(
            instance.format(-1.1234),
            `minus one should be negative`
        ).to.be.equal('-1');
    });
});
