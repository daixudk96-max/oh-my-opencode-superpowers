/**
 * Boulder State Constants
 */
export const BOULDER_DIR = ".sisyphus";
export const BOULDER_FILE = "boulder.json";
export const BOULDER_STATE_PATH = `${BOULDER_DIR}/${BOULDER_FILE}`;
export const NOTEPAD_DIR = "notepads";
export const NOTEPAD_BASE_PATH = `${BOULDER_DIR}/${NOTEPAD_DIR}`;
/** Primary changes directory - all plans go here */
export const CHANGES_DIR = "changes";
// TDD-EXEMPT: Exporting legacy path for start-work hook compatibility
/** Legacy Prometheus plan directory pattern */
export const LEGACY_PROMETHEUS_PLANS_DIR = ".sisyphus/plans";
export const PROMETHEUS_PLANS_DIR = "changes"; // TDD-EXEMPT: path migration fix
