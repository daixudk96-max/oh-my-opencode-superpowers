import { isFeatureBranch, getDiffSummary } from "./src/hooks/pr-context-injector/index";

async function test() {
  try {
    const isFeature = await isFeatureBranch();
    console.log("isFeatureBranch:", isFeature);
    if (isFeature) {
      const diff = await getDiffSummary();
      console.log("diff summary:", diff);
    }
  } catch(e) {
    console.log(e);
  }
}

test();
