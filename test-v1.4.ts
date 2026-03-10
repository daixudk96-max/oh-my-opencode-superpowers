import { classifySecurityTier, getSecurityAnalysisPrompt } from "./src/hooks/rules-injector/security-tiers";

const command = "export CI=true DEBIAN_FRONTEND=noninteractive GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never HOMEBREW_NO_AUTO_UPDATE=1 GIT_EDITOR=: EDITOR=: VISUAL='' GIT_SEQUENCE_EDITOR=: GIT_MERGE_AUTOEDIT=no GIT_PAGER=cat PAGER=cat npm_config_yes=true PIP_NO_INPUT=1 YARN_ENABLE_IMMUTABLE_INSTALLS=false; git push origin main --force";

const tier = classifySecurityTier("bash", { command });
console.log("Tier:", tier);

if (tier === "HIGH") {
  const prompt = getSecurityAnalysisPrompt("bash", tier, command);
  console.log("Prompt Injected:\n", prompt);
}
