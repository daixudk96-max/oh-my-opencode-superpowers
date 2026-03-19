/**
 * TDD State Tracker
 *
 * Tracks the current TDD state (RED/GREEN/REFACTOR) based on test execution results.
 * Provides state labels for terminal display.
 */
/**
 * TDD State enumeration
 */
export var TddState;
(function (TddState) {
    /** No tests or state not determined */
    TddState["NONE"] = "NONE";
    /** Failing tests exist - write minimal code to pass */
    TddState["RED"] = "RED";
    /** All tests pass - ready to refactor or write new test */
    TddState["GREEN"] = "GREEN";
    /** Refactoring while keeping tests green */
    TddState["REFACTOR"] = "REFACTOR";
})(TddState || (TddState = {}));
/**
 * TDD State Tracker implementation
 */
class TddStateTrackerImpl {
    state = TddState.NONE;
    testCount = { passed: 0, failed: 0, total: 0 };
    inRefactorMode = false;
    getState() {
        return this.state;
    }
    getStateLabel() {
        return `[TDD: ${this.state}]`;
    }
    getTestCount() {
        return { ...this.testCount };
    }
    updateFromTestResults(results) {
        // Update test counts
        this.testCount = {
            passed: results.passed,
            failed: results.failed,
            total: results.total,
        };
        // No tests = NONE state
        if (results.total === 0) {
            this.state = TddState.NONE;
            this.inRefactorMode = false;
            return;
        }
        // Failing tests = RED state (exits refactor mode)
        if (results.hasFailingTests) {
            this.state = TddState.RED;
            this.inRefactorMode = false;
            return;
        }
        // All tests pass
        if (this.inRefactorMode) {
            // Stay in REFACTOR if we're refactoring and tests still pass
            this.state = TddState.REFACTOR;
        }
        else {
            // Otherwise we're GREEN
            this.state = TddState.GREEN;
        }
    }
    enterRefactorMode() {
        // Can only enter refactor mode when GREEN
        if (this.state === TddState.GREEN) {
            this.inRefactorMode = true;
            this.state = TddState.REFACTOR;
        }
    }
    exitRefactorMode() {
        if (this.inRefactorMode) {
            this.inRefactorMode = false;
            // If tests were passing, go back to GREEN
            if (this.testCount.failed === 0 && this.testCount.total > 0) {
                this.state = TddState.GREEN;
            }
        }
    }
    reset() {
        this.state = TddState.NONE;
        this.testCount = { passed: 0, failed: 0, total: 0 };
        this.inRefactorMode = false;
    }
}
/**
 * Create a new TDD State Tracker instance
 */
export function createTddStateTracker() {
    return new TddStateTrackerImpl();
}
