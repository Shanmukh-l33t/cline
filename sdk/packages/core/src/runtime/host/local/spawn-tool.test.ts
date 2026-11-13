import { describe, expect, it } from "vitest";
import type {
	SubAgentEndContext,
	SubAgentStartContext,
} from "../../../extensions/tools/team";
import type { CoreSessionConfig } from "../../../types/config";
import {
	createSessionSubAgentLifecycleCallbacks,
	type SpawnToolDeps,
} from "./spawn-tool";

const config = {
	telemetry: undefined,
	modelId: "mock-model",
	providerId: "anthropic",
} as unknown as CoreSessionConfig;

const startContext: SubAgentStartContext = {
	subAgentId: "sub-1",
	conversationId: "conv-1",
	parentAgentId: "parent-1",
	input: { systemPrompt: "System", task: "Do task" },
};

const endContext: SubAgentEndContext = { ...startContext };

describe("createSessionSubAgentLifecycleCallbacks", () => {
	it("ignores observer backend failures instead of leaking unhandled rejections", async () => {
		const rejections: unknown[] = [];
		const onUnhandledRejection = (reason: unknown) => {
			rejections.push(reason);
		};
		process.on("unhandledRejection", onUnhandledRejection);
		try {
			const deps: SpawnToolDeps = {
				getSession: () => undefined,
				subAgentStarts: new Map(),
				onAgentEvent: () => {},
				invokeBackendOptional: async () => {
					throw new Error("observer backend failed");
				},
			};
			const lifecycle = createSessionSubAgentLifecycleCallbacks(
				deps,
				config,
				"root-session",
			);
			lifecycle.onSubAgentStart(startContext);
			lifecycle.onSubAgentEnd(endContext);
			await new Promise((resolve) => setTimeout(resolve, 25));
			expect(rejections).toEqual([]);
		} finally {
			process.off("unhandledRejection", onUnhandledRejection);
		}
	});
});
