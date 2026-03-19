/**
 * Session Quality Scorer
 *
 * Evaluates session quality based on:
 * - Test coverage (40% weight)
 * - Code quality - no lint/type errors (30% weight)
 * - Task completion rate (30% weight)
 */
/**
 * Quality grade enumeration
 */
export var QualityGrade;
(function (QualityGrade) {
    QualityGrade["A"] = "A";
    QualityGrade["B"] = "B";
    QualityGrade["C"] = "C";
    QualityGrade["D"] = "D";
    QualityGrade["F"] = "F";
    QualityGrade["NA"] = "N/A";
})(QualityGrade || (QualityGrade = {}));
/**
 * Score weights for different categories
 */
const WEIGHTS = {
    testCoverage: 0.4,
    codeQuality: 0.3,
    taskCompletion: 0.3,
};
/**
 * Penalty points per error type
 */
const PENALTIES = {
    lintError: 2,
    typeError: 5,
};
/**
 * Grade thresholds
 */
const GRADE_THRESHOLDS = {
    A: 90,
    B: 80,
    C: 70,
    D: 60,
};
import { log } from "../../shared";
/**
 * Session Scorer implementation
 */
class SessionScorerImpl {
    metrics = {
        modifiedFiles: 0,
        filesWithTests: 0,
        lintErrors: 0,
        typeErrors: 0,
        tasksCompleted: 0,
        tasksTotal: 0,
    };
    updateMetrics(metrics) {
        this.metrics = { ...metrics };
    }
    getTestCoverageScore() {
        if (this.metrics.modifiedFiles === 0) {
            return 0;
        }
        return Math.round((this.metrics.filesWithTests / this.metrics.modifiedFiles) * 100);
    }
    getCodeQualityScore() {
        const lintPenalty = this.metrics.lintErrors * PENALTIES.lintError;
        const typePenalty = this.metrics.typeErrors * PENALTIES.typeError;
        const totalPenalty = lintPenalty + typePenalty;
        return Math.max(0, 100 - totalPenalty);
    }
    getTaskCompletionScore() {
        if (this.metrics.tasksTotal === 0) {
            return 0;
        }
        return Math.round((this.metrics.tasksCompleted / this.metrics.tasksTotal) * 100);
    }
    getScore() {
        // No files modified = no score
        if (this.metrics.modifiedFiles === 0 && this.metrics.tasksTotal === 0) {
            return 0;
        }
        const testScore = this.getTestCoverageScore() * WEIGHTS.testCoverage;
        const qualityScore = this.getCodeQualityScore() * WEIGHTS.codeQuality;
        const completionScore = this.getTaskCompletionScore() * WEIGHTS.taskCompletion;
        return Math.round(testScore + qualityScore + completionScore);
    }
    getGrade() {
        // No activity = N/A
        if (this.metrics.modifiedFiles === 0 && this.metrics.tasksTotal === 0) {
            return QualityGrade.NA;
        }
        const score = this.getScore();
        if (score >= GRADE_THRESHOLDS.A)
            return QualityGrade.A;
        if (score >= GRADE_THRESHOLDS.B)
            return QualityGrade.B;
        if (score >= GRADE_THRESHOLDS.C)
            return QualityGrade.C;
        if (score >= GRADE_THRESHOLDS.D)
            return QualityGrade.D;
        return QualityGrade.F;
    }
    getDisplayString() {
        const grade = this.getGrade();
        const score = this.getScore();
        if (grade === QualityGrade.NA) {
            return "会话质量: N/A (无代码变更)";
        }
        return `会话质量: ${grade} (${score}/100)`;
    }
    reset() {
        this.metrics = {
            modifiedFiles: 0,
            filesWithTests: 0,
            lintErrors: 0,
            typeErrors: 0,
            tasksCompleted: 0,
            tasksTotal: 0,
        };
    }
    async event(input) {
        if (input.event.type === "session.stop") {
            log(this.getDisplayString());
        }
    }
}
/**
 * Create a new Session Scorer instance
 */
export function createSessionScorer() {
    return new SessionScorerImpl();
}
