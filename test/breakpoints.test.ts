/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as path from 'path';
import {DebugClient} from 'vscode-debugadapter-testsupport';
import {DebugProtocol} from 'vscode-debugprotocol';

import * as testUtils from './testUtils';
import * as testSetup from './testSetup';

suite('Breakpoints', () => {
    const DATA_ROOT = testSetup.DATA_ROOT;

    let dc: DebugClient;
    setup(() => {
        return testSetup.setup()
            .then(_dc => dc = _dc);
    });

    teardown(() => {
        return testSetup.teardown();
    });

    suite('setBreakpoints', () => {
        test('should stop on a breakpoint', () => {
            const PROGRAM = path.join(DATA_ROOT, 'program.js');
            const BREAKPOINT_LINE = 2;

            return dc.hitBreakpoint({ program: PROGRAM }, { path: PROGRAM, line: BREAKPOINT_LINE} );
        });

        test('should stop on a breakpoint in file with spaces in its name', () => {
            const PROGRAM = path.join(DATA_ROOT, 'folder with spaces', 'file with spaces.js');
            const BREAKPOINT_LINE = 2;

            return dc.hitBreakpoint({ program: PROGRAM }, { path: PROGRAM, line: BREAKPOINT_LINE} );
        });

        test('should stop on a breakpoint identical to the entrypoint', () => {        // verifies the 'hide break on entry point' logic
            const PROGRAM = path.join(DATA_ROOT, 'program.js');
            const ENTRY_LINE = 1;

            return dc.hitBreakpoint({ program: PROGRAM }, { path: PROGRAM, line: ENTRY_LINE } );
        });

        // Microsoft/vscode-chrome-debug-core#73
        test.skip('should break on a specific column in a single line program', () => {
            const SINGLE_LINE_PROGRAM = path.join(DATA_ROOT, 'programSingleLine.js');
            const LINE = 1;
            const COLUMN = 55;

            return dc.hitBreakpoint({ program: SINGLE_LINE_PROGRAM }, { path: SINGLE_LINE_PROGRAM, line: LINE, column: COLUMN } );
        });

        test('should stop on a conditional breakpoint', () => {
            const PROGRAM = path.join(DATA_ROOT, 'program.js');
            const COND_BREAKPOINT_LINE = 13;
            const COND_BREAKPOINT_COLUMN = 2;

            const bp: DebugProtocol.SourceBreakpoint = { line: COND_BREAKPOINT_LINE, column: COND_BREAKPOINT_COLUMN, condition: 'i === 3' };
            return Promise.all([
                testUtils.setBreakpointOnStart(dc, [bp], PROGRAM, COND_BREAKPOINT_LINE, COND_BREAKPOINT_COLUMN),

                dc.launch({ program: PROGRAM }),

                dc.assertStoppedLocation('breakpoint', { path: PROGRAM, line: COND_BREAKPOINT_LINE } ).then(response => {
                    const frame = response.body.stackFrames[0];
                    return dc.evaluateRequest({ context: 'watch', frameId: frame.id, expression: 'x' }).then(response => {
                        assert.equal(response.body.result, 9, 'x !== 9');
                        return response;
                    });
                })
            ]);
        });
    });

    suite('setBreakpoints in TypeScript', () => {
        test('should stop on a breakpoint in source (all files top level)', () => {
            const PROGRAM = path.join(DATA_ROOT, 'sourcemaps-simple/classes.js');
            const TS_SOURCE = path.join(DATA_ROOT, 'sourcemaps-simple/classes.ts');
            const TS_LINE = 17;

            return dc.hitBreakpoint({
                program: PROGRAM,
                sourceMaps: true,
                runtimeArgs: [ '--nolazy' ]
            }, {
                path: TS_SOURCE,
                line: TS_LINE
            });
        });

        // Find map beside generated
        test.skip('should stop on a breakpoint in source (all files top level, missing sourceMappingURL)', () => {
            const PROGRAM = path.join(DATA_ROOT, 'sourcemaps-simple-no-sourceMappingURL/classes.js');
            const TS_SOURCE = path.join(DATA_ROOT, 'sourcemaps-simple-no-sourceMappingURL/classes.ts');
            const TS_LINE = 17;

            return dc.hitBreakpoint({
                program: PROGRAM,
                sourceMaps: true,
                runtimeArgs: [ '--nolazy' ]
            }, {
                path: TS_SOURCE,
                line: TS_LINE
            });
        });

        test('should stop on a breakpoint in source (outDir)', () => {
            const PROGRAM = path.join(DATA_ROOT, 'sourcemaps-inline/src/classes.ts');
            const OUT_DIR = path.join(DATA_ROOT, 'sourcemaps-inline/dist');
            const BREAKPOINT_LINE = 17;

            return dc.hitBreakpoint({
                program: PROGRAM,
                sourceMaps: true,
                outDir: OUT_DIR,
                runtimeArgs: [ '--nolazy' ]
            }, {
                path: PROGRAM,
                line: BREAKPOINT_LINE
            });
        });

        test('should stop on a breakpoint in source (outFiles)', () => {
            const PROGRAM = path.join(DATA_ROOT, 'sourcemaps-inline/src/classes.ts');
            const OUT_FILES = path.join(DATA_ROOT, 'sourcemaps-inline/dist/**/*.js');
            const BREAKPOINT_LINE = 17;

            return dc.hitBreakpoint({
                program: PROGRAM,
                sourceMaps: true,
                outFiles: [ OUT_FILES ],
                runtimeArgs: [ '--nolazy' ],
                verboseDiagnosticLogging: true
            }, {
                path: PROGRAM,
                line: BREAKPOINT_LINE
            });
        });

        test('should stop on a breakpoint in source with spaces in paths (outDir)', () => {
            const PROGRAM = path.join(DATA_ROOT, 'sourcemaps with spaces', 'the source/classes.ts');
            const OUT_DIR = path.join(DATA_ROOT, 'sourcemaps with spaces/the distribution');
            const BREAKPOINT_LINE = 17;

            return dc.hitBreakpoint({
                program: PROGRAM,
                sourceMaps: true,
                outDir: OUT_DIR,
                runtimeArgs: [ '--nolazy' ],
                verboseDiagnosticLogging: true
            }, {
                path: PROGRAM,
                line: BREAKPOINT_LINE
            });
        });

        test('should stop on a breakpoint in source with spaces in paths (outFiles)', () => {
            const PROGRAM = path.join(DATA_ROOT, 'sourcemaps with spaces', 'the source/classes.ts');
            const OUT_FILES = path.join(DATA_ROOT, 'sourcemaps with spaces/the distribution/**/*.js');
            const BREAKPOINT_LINE = 17;

            return dc.hitBreakpoint({
                program: PROGRAM,
                sourceMaps: true,
                outFiles: [ OUT_FILES ],
                runtimeArgs: [ '--nolazy' ],
                verboseDiagnosticLogging: true
            }, {
                path: PROGRAM,
                line: BREAKPOINT_LINE
            });
        });


        test('should stop on a breakpoint in source - Microsoft/vscode#2574', () => {
            const PROGRAM = path.join(DATA_ROOT, 'sourcemaps-2574/out/classes.js');
            const OUT_DIR = path.join(DATA_ROOT, 'sourcemaps-2574/out');
            const TS_SOURCE = path.join(DATA_ROOT, 'sourcemaps-2574/src/classes.ts');
            const TS_LINE = 17;

            return dc.hitBreakpoint({
                program: PROGRAM,
                sourceMaps: true,
                outDir: OUT_DIR,
                runtimeArgs: [ '--nolazy' ]
            }, {
                path: TS_SOURCE,
                line: TS_LINE
            });
        });

        // Find map next to js
        test.skip('should stop on a breakpoint in source (sourceMappingURL missing)', () => {
            const PROGRAM = path.join(DATA_ROOT, 'sourcemap-no-sourceMappingURL/out/classes.js');
            const OUT_DIR = path.join(DATA_ROOT, 'sourcemap-no-sourceMappingURL/out');
            const TS_SOURCE = path.join(DATA_ROOT, 'sourcemap-no-sourceMappingURL/src/classes.ts');
            const TS_LINE = 17;

            return dc.hitBreakpoint({
                program: PROGRAM,
                sourceMaps: true,
                outDir: OUT_DIR,
                runtimeArgs: [ '--nolazy' ]
            }, {
                path: TS_SOURCE,
                line: TS_LINE
            });
        });

        test('should stop on a breakpoint in source even if breakpoint was set in JavaScript - Microsoft/vscode-node-debug#43', () => {
            const PROGRAM = path.join(DATA_ROOT, 'sourcemaps-2574/out/classes.js');
            const OUT_DIR = path.join(DATA_ROOT, 'sourcemaps-2574/out');
            const JS_SOURCE = PROGRAM;
            const JS_LINE = 21;
            const TS_SOURCE = path.join(DATA_ROOT, 'sourcemaps-2574/src/classes.ts');
            const TS_LINE = 17;

            return dc.hitBreakpoint({
                program: PROGRAM,
                sourceMaps: true,
                outDir: OUT_DIR,
                runtimeArgs: [ '--nolazy' ]
            }, {
                path: JS_SOURCE,
                line: JS_LINE
            }, {
                path: TS_SOURCE,
                line: TS_LINE
            });
        });

        test('should stop on a breakpoint when the sourcemap is loaded after the bp is set', () => {
            const BP_PROGRAM = path.join(DATA_ROOT, 'sourcemaps-setinterval', 'src/file2.ts');
            const LAUNCH_PROGRAM = path.join(DATA_ROOT, 'sourcemaps-setinterval', 'dist/program.js');
            const BP_LINE = 10;

            return Promise.all<DebugProtocol.ProtocolMessage>([
                testUtils.waitForEvent(dc, 'initialized').then(event => {
                    return dc.setBreakpointsRequest({ source: { path: BP_PROGRAM }, breakpoints: [{ line: BP_LINE }]}).then(response => {
                        assert.equal(response.body.breakpoints.length, 1);
                        assert(!response.body.breakpoints[0].verified, 'Expected bp to not be verified yet');
                        return dc.configurationDoneRequest();
                    });
                }),
                dc.launch({ program: LAUNCH_PROGRAM, sourceMaps: true }),
                testUtils.waitForEvent(dc, 'breakpoint').then((event: DebugProtocol.BreakpointEvent) => {
                    assert(event.body.breakpoint.verified);
                    return null;
                }),

                dc.assertStoppedLocation('breakpoint', { path: BP_PROGRAM, line: BP_LINE } )
            ]);
        });

        // Microsoft/vscode-chrome-debug-core#38
        test.skip('should stop on a breakpoint in source even if program\'s entry point is in JavaScript', () => {
            const PROGRAM = path.join(DATA_ROOT, 'sourcemaps-js-entrypoint/out/entry.js');
            const OUT_DIR = path.join(DATA_ROOT, 'sourcemaps-js-entrypoint/out');
            const TS_SOURCE = path.join(DATA_ROOT, 'sourcemaps-js-entrypoint/src/classes.ts');
            const TS_LINE = 17;

            return dc.hitBreakpoint({
                program: PROGRAM,
                sourceMaps: true,
                outDir: OUT_DIR,
                runtimeArgs: [ '--nolazy' ]
            }, { path: TS_SOURCE, line: TS_LINE } );
        });
    });

    suite('setExceptionBreakpoints', () => {
        const PROGRAM = path.join(DATA_ROOT, 'programWithException.js');

        // Terminate at end
        test.skip('should not stop on an exception', () => {
            return Promise.all<DebugProtocol.ProtocolMessage>([
                testUtils.waitForEvent(dc, 'initialized').then(event => {
                    return dc.setExceptionBreakpointsRequest({
                        filters: [ ]
                    });
                }).then(response => {
                    return dc.configurationDoneRequest();
                }),

                dc.launch({ program: PROGRAM }),

                testUtils.waitForEvent(dc, 'terminated')
            ]);
        });

        test('should stop on a caught exception', () => {
            const EXCEPTION_LINE = 6;

            return Promise.all([
                testUtils.waitForEvent(dc, 'initialized').then(event => {
                    return dc.setExceptionBreakpointsRequest({
                        filters: [ 'all' ]
                    });
                }).then(response => {
                    return dc.configurationDoneRequest();
                }),

                dc.launch({ program: PROGRAM }),

                dc.assertStoppedLocation('exception', { path: PROGRAM, line: EXCEPTION_LINE } )
            ]);
        });

        test('should stop on uncaught exception', () => {
            const UNCAUGHT_EXCEPTION_LINE = 12;

            return Promise.all([
                testUtils.waitForEvent(dc, 'initialized').then(event => {
                    return dc.setExceptionBreakpointsRequest({
                        filters: [ 'uncaught' ]
                    });
                }).then(response => {
                    return dc.configurationDoneRequest();
                }),

                dc.launch({ program: PROGRAM }),

                dc.assertStoppedLocation('exception', { path: PROGRAM, line: UNCAUGHT_EXCEPTION_LINE } )
            ]);
        });
    });
});