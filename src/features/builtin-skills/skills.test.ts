import { describe, expect, test } from "bun:test"
import { createBuiltinSkills } from "./skills"

describe("createBuiltinSkills", () => {
	test("returns playwright skill by default", () => {
		// given - no options (default)

		// when
		const skills = createBuiltinSkills()

		// then
		const browserSkill = skills.find((s) => s.name === "playwright")
		expect(browserSkill).toBeDefined()
		expect(browserSkill?.description).toContain("browser")
		expect(browserSkill?.mcpConfig).toHaveProperty("playwright")
	})

	test("returns playwright skill when browserProvider is 'playwright'", () => {
		// given
		const options = { browserProvider: "playwright" as const }

		// when
		const skills = createBuiltinSkills(options)

		// then
		const playwrightSkill = skills.find((s) => s.name === "playwright")
		const agentBrowserSkill = skills.find((s) => s.name === "agent-browser")
		expect(playwrightSkill).toBeDefined()
		expect(agentBrowserSkill).toBeUndefined()
	})

	test("returns agent-browser skill when browserProvider is 'agent-browser'", () => {
		// given
		const options = { browserProvider: "agent-browser" as const }

		// when
		const skills = createBuiltinSkills(options)

		// then
		const agentBrowserSkill = skills.find((s) => s.name === "agent-browser")
		const playwrightSkill = skills.find((s) => s.name === "playwright")
		expect(agentBrowserSkill).toBeDefined()
		expect(agentBrowserSkill?.description).toContain("browser")
		expect(agentBrowserSkill?.allowedTools).toContain("Bash(agent-browser:*)")
		expect(agentBrowserSkill?.template).toContain("agent-browser")
		expect(playwrightSkill).toBeUndefined()
	})

	test("agent-browser skill template is inlined (not loaded from file)", () => {
		// given
		const options = { browserProvider: "agent-browser" as const }

		// when
		const skills = createBuiltinSkills(options)
		const agentBrowserSkill = skills.find((s) => s.name === "agent-browser")

		// then - template should contain substantial content (inlined, not fallback)
		expect(agentBrowserSkill?.template).toContain("## Quick start")
		expect(agentBrowserSkill?.template).toContain("## Commands")
		expect(agentBrowserSkill?.template).toContain("agent-browser open")
		expect(agentBrowserSkill?.template).toContain("agent-browser snapshot")
	})

	test("always includes frontend-ui-ux and git-master skills", () => {
		// given - both provider options

		// when
		const defaultSkills = createBuiltinSkills()
		const agentBrowserSkills = createBuiltinSkills({ browserProvider: "agent-browser" })

		// then
		for (const skills of [defaultSkills, agentBrowserSkills]) {
			expect(skills.find((s) => s.name === "frontend-ui-ux")).toBeDefined()
			expect(skills.find((s) => s.name === "git-master")).toBeDefined()
		}
	})

	test("includes brainstorming skill", () => {
		// #given
		const skills = createBuiltinSkills()

		// #when
		const names = skills.map((skill) => skill.name)

		// #then
		expect(names).toContain("brainstorming")
	})

	test("includes creating-changes skill", () => {
		// #given
		const skills = createBuiltinSkills()

		// #when
		const names = skills.map((skill) => skill.name)

		// #then
		expect(names).toContain("creating-changes")
	})

	test("includes execution and completion skills", () => {
		// #given
		const skills = createBuiltinSkills()

		// #when
		const names = skills.map((skill) => skill.name)

		// #then
		const expected = [
			"tdd",
			"test-driven-development",
			"systematic-debugging",
			"requesting-code-review",
			"receiving-code-review",
			"collaborating-with-codex",
			"collaborating-with-gemini",
			"verification-before-completion",
			"using-git-worktrees",
			"dispatching-parallel-agents",
			"subagent-driven-development",
			"finishing-a-development-branch",
			"archiving-changes",
			"writing-skills",
			"wave-parallel-execution",
			"executing-plans",
		]

		for (const name of expected) {
			expect(names).toContain(name)
		}
	})

	test("executing-plans skill includes execution-oriented reporting guidance", () => {
		const skills = createBuiltinSkills()
		const skill = skills.find((s) => s.name === "executing-plans")

		expect(skill).toBeDefined()
		expect(skill?.template).toContain(
			"Use direct language in execution updates.",
		)
		expect(skill?.template).toContain(
			"Define done in concrete terms before you report completion.",
		)
		expect(skill?.template).toContain(
			"Verify the relevant files, tests, or outputs before you say work is done.",
		)
	})

	test("keeps unrelated builtin skills free of executing-plans reporting guidance", () => {
		const skills = createBuiltinSkills()

		for (const name of [
			"wave-parallel-execution",
			"verification-before-completion",
		] as const) {
			const skill = skills.find((entry) => entry.name === name)

			expect(skill).toBeDefined()
			expect(skill?.template).not.toContain(
				"Use direct language in execution updates.",
			)
			expect(skill?.template).not.toContain(
				"Define done in concrete terms before you report completion.",
			)
		}
	})

	test("should exclude playwright when it is in disabledSkills", () => {
		// #given
		const baselineCount = createBuiltinSkills().length
		const options = { disabledSkills: new Set(["playwright"]) }

		// #when
		const skills = createBuiltinSkills(options)

		// #then
		expect(skills.map((s) => s.name)).not.toContain("playwright")
		expect(skills.map((s) => s.name)).toContain("frontend-ui-ux")
		expect(skills.map((s) => s.name)).toContain("git-master")
		expect(skills.map((s) => s.name)).toContain("dev-browser")
		expect(skills.length).toBe(baselineCount - 1)
	})

	test("should exclude multiple skills when they are in disabledSkills", () => {
		// #given
		const baselineCount = createBuiltinSkills().length
		const options = { disabledSkills: new Set(["playwright", "git-master"]) }

		// #when
		const skills = createBuiltinSkills(options)

		// #then
		expect(skills.map((s) => s.name)).not.toContain("playwright")
		expect(skills.map((s) => s.name)).not.toContain("git-master")
		expect(skills.map((s) => s.name)).toContain("frontend-ui-ux")
		expect(skills.map((s) => s.name)).toContain("dev-browser")
		expect(skills.length).toBe(baselineCount - 2)
	})

	test("should return an empty array when all skills are disabled", () => {
		// #given
		const allSkillNames = createBuiltinSkills().map((skill) => skill.name)
		const options = { disabledSkills: new Set(allSkillNames) }

		// #when
		const skills = createBuiltinSkills(options)

		// #then
		expect(skills.length).toBe(0)
	})

	test("should return all skills when disabledSkills set is empty", () => {
		// #given
		const baselineCount = createBuiltinSkills().length
		const options = { disabledSkills: new Set<string>() }

		// #when
		const skills = createBuiltinSkills(options)

		// #then
		expect(skills.length).toBe(baselineCount)
		expect(skills.map((skill) => skill.name)).toContain("brainstorming")
		expect(skills.map((skill) => skill.name)).toContain("creating-changes")
	})

	test("returns playwright-cli skill when browserProvider is 'playwright-cli'", () => {
		// given
		const options = { browserProvider: "playwright-cli" as const }

		// when
		const skills = createBuiltinSkills(options)

		// then
		const playwrightSkill = skills.find((s) => s.name === "playwright")
		const agentBrowserSkill = skills.find((s) => s.name === "agent-browser")
		expect(playwrightSkill).toBeDefined()
		expect(playwrightSkill?.description).toContain("browser")
		expect(playwrightSkill?.allowedTools).toContain("Bash(playwright-cli:*)")
		expect(playwrightSkill?.mcpConfig).toBeUndefined()
		expect(agentBrowserSkill).toBeUndefined()
	})

	test("playwright-cli skill template contains CLI commands", () => {
		// given
		const options = { browserProvider: "playwright-cli" as const }

		// when
		const skills = createBuiltinSkills(options)
		const skill = skills.find((s) => s.name === "playwright")

		// then
		expect(skill?.template).toContain("playwright-cli open")
		expect(skill?.template).toContain("playwright-cli snapshot")
		expect(skill?.template).toContain("playwright-cli click")
	})
})
