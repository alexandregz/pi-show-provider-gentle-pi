/**
 * show-provider extension for Pi.
 *
 * Provides the `/show-provider-gentle-pi` command to toggle whether gentle-pi's
 * shell bar shows `provider / model` instead of just `model`. The argument is
 * `on` or `off`.
 *
 * This patches the core source file `gentle-shell.ts` (the same change the legacy
 * `patch-pi-footer` bash function applies). Unlike a bash `sed`, it works the same
 * on macOS (BSD sed) and Linux (GNU sed).
 *
 * Behavior contract:
 *   - `on`  backs up the target once and applies the patch. It never overwrites a
 *            file that is already patched.
 *   - `off` reverse-replaces the patched fragment back to the original line. It
 *            never touches a file that is already restored.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// We anchor detection to the exact `modelId` field assignment, never to a bare
// substring: newer gentle-pi releases use `` `${model.provider}/${model.id}` ``
// elsewhere in the file (e.g. the adaptive-reasoning key), so a loose substring
// match would always report "already patched" and the toggle would never act.
// `gentle-shell.ts` writes `modelId` with leading indentation, so we match the
// assignment substring, not the whole line (mirrors the original `sed`).
const ORIGINAL_FRAG = `modelId: model?.id ?? "no-model"`;
const PATCHED_FRAG = `modelId: model ? \`\${model.provider}/\${model.id}\` : "no-model"`;

/** True when the text is already showing provider/model. */
export function isProviderShown(text: string): boolean {
	return text.includes(PATCHED_FRAG);
}

/** True when the text still has the original `no-model` fragment. */
export function isOriginal(text: string): boolean {
	return text.includes(ORIGINAL_FRAG);
}

export type PatchResult =
	| { type: "ok"; text: string }
	| { type: "noop"; reason: string };

/** Returns the text patched to show provider/model, or a noop reason. */
export function applyShowProvider(text: string): PatchResult {
	if (isProviderShown(text)) return { type: "noop", reason: "already-on" };
	if (!isOriginal(text)) return { type: "noop", reason: "unrecognized" };
	return { type: "ok", text: text.replaceAll(ORIGINAL_FRAG, PATCHED_FRAG) };
}

/** Returns the text reverted to the original `no-model` line, or a noop reason. */
export function applyHideProvider(text: string): PatchResult {
	if (isOriginal(text)) return { type: "noop", reason: "already-off" };
	if (!isProviderShown(text)) return { type: "noop", reason: "unrecognized" };
	return { type: "ok", text: text.replaceAll(PATCHED_FRAG, ORIGINAL_FRAG) };
}

/** `YYYYMMDDHHMMSS` stamp, matching the legacy backup filename format. */
export function timestamp(now: Date = new Date()): string {
	const p = (n: number, w = 2) => String(n).padStart(w, "0");
	return (
		`${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
		`${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
	);
}

// Resolve the gentle-pi core file. Precedence:
//   1. explicit env override
//   2. sibling package inside the same node_modules root (works for global and
//      project-local installs)
//   3. well-known home path (legacy bash default)
const DEFAULT_TARGET = (home = homedir()) => join(home, ".pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts");

function siblingTarget(): string | undefined {
	// This file lives at <root>/node_modules/<pkg>/extensions/show-provider.ts,
	// so gentle-pi, when installed in the same root, is a sibling package. The
	// target must be <root>/node_modules/gentle-pi/extensions/gentle-shell.ts,
	// i.e. two levels up (pkg -> node_modules) then the sibling dir. An extra
	// "node_modules" segment here would produce a path that never exists and
	// silently fall back to the default, breaking project-local installs.
	const ownDir = dirname(fileURLToPath(import.meta.url));
	const candidate = join(ownDir, "..", "..", "gentle-pi/extensions/gentle-shell.ts");
	return existsSync(candidate) ? candidate : undefined;
}

export function resolveTargetWithSibling(env: NodeJS.ProcessEnv = process.env): string {
	const override = env.PI_SHOW_PROVIDER_GENTLE_PI_TARGET?.trim();
	if (override) return resolve(override);
	const sibling = siblingTarget();
	if (sibling) return sibling;
	return DEFAULT_TARGET();
}

interface NotifyLike {
	notify(message: string, tone?: "info" | "success" | "warning" | "error"): void;
}

async function runToggle(
	dir: "on" | "off",
	target: string,
	notify: NotifyLike["notify"],
	now: Date = new Date(),
	fs: { read: typeof readFile; write: typeof writeFile; copy: typeof copyFile } = {
		read: readFile,
		write: writeFile,
		copy: copyFile,
	},
): Promise<void> {
	if (!existsSync(target)) {
		notify(`Non se atopou o ficheiro en: ${target}`, "error");
		return;
	}
	const text = await fs.read(target, "utf8");
	const result = dir === "on" ? applyShowProvider(text) : applyHideProvider(text);

	if (result.type === "noop") {
		const message =
			result.reason === "already-on"
				? "O footer xa amosa provider/model; non se tocou nada."
				: result.reason === "already-off"
					? "O footer xa está restaurado a só model; non se tocou nada."
					: "Non se recoñeceu o estado actual do ficheiro; non se tocou nada.";
		notify(message, "info");
		return;
	}

	// `/on` keeps a timestamped backup of the pristine core file. `/off` only
	// reverses the patch and does not need one.
	if (dir === "on") {
		await fs.copy(target, `${target}.${timestamp(now)}`);
	}
	await fs.write(target, result.text);
	notify(
		dir === "on"
			? "Footer de gentle-pi parcheado: agora amosará provider / model ✅"
			: "Footer de gentle-pi restaurado: volve a amosar só model ✅",
		"success",
	);
}

export default function showProviderExtension(pi: ExtensionAPI): void {
	const usageHint = "Uso: /show-provider-gentle-pi on | off";

	pi.registerCommand("show-provider-gentle-pi", {
		description: "Toggle provider/model in the gentle-pi shell bar. Usage: /show-provider-gentle-pi on | off",
		getArgumentCompletions: (prefix) => {
			const options = ["on", "off"];
			const filtered = options.filter((value) => value.startsWith(prefix));
			return filtered.length > 0 ? filtered.map((value) => ({ value, label: value })) : null;
		},
		handler: async (
			args,
			ctx,
		) => {
			const dir = args.trim().toLowerCase();
			if (dir !== "on" && dir !== "off") {
				ctx.ui.notify(usageHint, "warning");
				return;
			}
			try {
				await runToggle(dir, resolveTargetWithSibling(), (m, t) => ctx.ui.notify(m, t));
			} catch (error) {
				ctx.ui.notify(`Erro ao ${dir === "on" ? "aplicar" : "reverter"} o parche: ${(error as Error).message}`, "error");
			}
		},
	});
}