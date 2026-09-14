/**
 * Tests for the show-provider toggle logic.
 *
 * These exercise the pure helpers against a temp copy of the real
 * `gentle-shell.ts` line — they never touch the installed gentle-pi file.
 */

import assert from "node:assert/strict";
import { test, after } from "node:test";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyShowProvider, applyHideProvider, isProviderShown, isOriginal, timestamp } from "../extensions/show-provider.ts";

// Real line from gentle-pi `extensions/gentle-shell.ts` (with tab indentation).
const ORIGINAL = `		modelId: model?.id ?? "no-model",`;
const SHOWN = `		modelId: model ? \`${'$'}{model.provider}/${'$'}{model.id}\` : "no-model",`;

let dir = "";
let shown = false;

after(async () => {
	if (dir) await rm(dir, { recursive: true, force: true });
	shown && (console.log("cleanup done"));
});

test("original fragment is detected and patched to provider/model", () => {
	assert.equal(isOriginal(ORIGINAL), true);
	assert.equal(isProviderShown(ORIGINAL), false);
	const res = applyShowProvider(ORIGINAL);
	assert.equal(res.type, "ok");
	const text = (res as { type: "ok"; text: string }).text;
	assert.equal(isProviderShown(text), true);
	assert.equal(isOriginal(text), false);
	assert.equal(text, SHOWN);
});

test("patched text is detected and reverted back to original", () => {
	assert.equal(isProviderShown(SHOWN), true);
	const res = applyHideProvider(SHOWN);
	assert.equal(res.type, "ok");
	const text = (res as { type: "ok"; text: string }).text;
	assert.equal(isOriginal(text), true);
	assert.equal(isProviderShown(text), false);
	assert.equal(text, ORIGINAL);
});

test("show is idempotent: already-patched text is a noop", () => {
	const res = applyShowProvider(SHOWN);
	assert.equal(res.type, "noop");
	assert.equal((res as { reason: string }).reason, "already-on");
});

test("hide is idempotent: already-original text is a noop", () => {
	const res = applyHideProvider(ORIGINAL);
	assert.equal(res.type, "noop");
	assert.equal((res as { reason: string }).reason, "already-off");
});

test("unrecognized text is a safe noop for both directions", () => {
	const weird = `modelId: something-weird`;
	assert.equal(applyShowProvider(weird).type, "noop");
	assert.equal(applyHideProvider(weird).type, "noop");
});

test("round-trips through an actual temp file (on -> off)", async () => {
	dir = await mkdtemp(join(tmpdir(), "show-provider-"));
	const target = join(dir, "gentle-shell.ts");
	await writeFile(target, ORIGINAL, "utf8");

	let box: { text: string } = { text: await readFile(target, "utf8") };

	const shownText = (applyShowProvider(box.text) as { text: string }).text;
	await writeFile(target, shownText, "utf8");
	box.text = await readFile(target, "utf8");
	assert.equal(isProviderShown(box.text), true);

	const reverted = (applyHideProvider(box.text) as { text: string }).text;
	await writeFile(target, reverted, "utf8");
	box.text = await readFile(target, "utf8");
	assert.equal(isOriginal(box.text), true);
});

test("timestamp is YYYYMMDDHHMMSS", () => {
	assert.match(timestamp(new Date(2026, 8, 12, 1, 26, 24)), /^20260912012624$/);
});