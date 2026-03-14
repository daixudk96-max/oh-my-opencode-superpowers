import { createFinalAuditHook } from "../../../hooks/stop/final-audit-hook"
import { log } from "../../../shared"
import type { HookManifest } from "../../types"

const SESSION_STOP_EVENT = "session.stop"

export const manifest: HookManifest = {
  name: "final-audit",
  lifecycle: ["event"],
  alwaysEnabled: true,
  factory: () => {
    const finalAudit = createFinalAuditHook()

    return {
      event: (input: unknown) => {
        const eventType = (input as { event?: { type?: string } })?.event?.type
        if (eventType !== SESSION_STOP_EVENT) {
          return
        }

        void finalAudit
          .runAudit()
          .then((result) => {
            const report = finalAudit.generateReport(result)
            log("[final-audit] Stop-stage final audit completed", {
              overallSuccess: result.overallSuccess,
            })
            log(`[final-audit]\n${report}`)
          })
          .catch((error) => {
            log("[final-audit] Stop-stage final audit failed", {
              error: error instanceof Error ? error.message : String(error),
            })
          })
      },
    }
  },
}
