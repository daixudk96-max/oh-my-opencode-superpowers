import { createFinalAuditHook } from "../../../hooks/stop/final-audit-hook";
import { log } from "../../../shared";
const SESSION_STOP_EVENT = "session.stop";
export const manifest = {
    name: "final-audit",
    lifecycle: ["event"],
    alwaysEnabled: true,
    factory: () => {
        const finalAudit = createFinalAuditHook();
        return {
            event: (input) => {
                const eventType = input?.event?.type;
                if (eventType !== SESSION_STOP_EVENT) {
                    return;
                }
                void finalAudit
                    .runAudit()
                    .then((result) => {
                    const report = finalAudit.generateReport(result);
                    log("[final-audit] Stop-stage final audit completed", {
                        overallSuccess: result.overallSuccess,
                    });
                    log(`[final-audit]\n${report}`);
                })
                    .catch((error) => {
                    log("[final-audit] Stop-stage final audit failed", {
                        error: error instanceof Error ? error.message : String(error),
                    });
                });
            },
        };
    },
};
