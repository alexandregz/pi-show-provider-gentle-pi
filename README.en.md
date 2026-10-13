# pi-show-provider-gentle-pi

[Versión en galego →](README.md)

Patches **gentle-pi**'s shell bar (the shell for [Pi](https://pi-coding.com)) to show `provider / model` instead of just `model`. It does so by editing the core source file directly: `extensions/gentle-shell.ts`.

![gentle-pi shell bar showing provider / model](screenshot.png)

## 🚀 Usage

Install the package (local, git, or npm) and restart Pi:

```bash
pi install ./pi-show-provider-gentle-pi        # or git:/npm:
```

Inside Pi run:

```bash
/show-provider-gentle-pi on     # patch: the bar shows "provider / model"
/show-provider-gentle-pi off    # revert: the bar shows only "model" again
```

## 🔧 Why a core patch?

The shell bar builds the model identifier in `buildShellBarModel()`, inside `extensions/gentle-shell.ts`:

```ts
// original
	modelId: model?.id ?? "no-model",
```

The patch replaces that fragment with:

```ts
// after the patch
	modelId: model ? `${model.provider}/${model.id}` : "no-model",
```

While gentle-pi builds `modelId` in the core itself, an external extension cannot change it: this one performs the physical edit on the file, like the shell alias you used before.

## ✅ Behavior

- **`/show-provider-gentle-pi on`** — First takes a timestamped backup (`gentle-shell.ts.YYYYMMDDHHMMSS`), then applies the patch. It is protected against overwriting: **if the file is already patched, it touches nothing** and warns you.
- **`/show-provider-gentle-pi off`** — Reverts the patch by editing the file itself (it does not restore the backup, so you don't lose it even if the backup is from an old gentle-pi version). It is protected against overwriting: **if the file is already restored, it touches nothing** and warns you.
- Works identically on **macOS and Linux** (no BSD/GNU `sed` dependency).

## 💾 Backup

- **Where**: in the same directory as the original file.
- **Filename format**: `gentle-shell.ts.YYYYMMDDHHMMSS`, stamped with the time `/show-provider-gentle-pi on` ran (e.g. `gentle-shell.ts.20260912012624`).

List the backups:

```bash
ls -la ~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts.*
```

## ⚙️ Details

- **State detection**: it inspects the **full `modelId` field**, not a bare substring and not a method name. If it contains `modelId: model ? \`${model.provider}/${model.id}\` : "no-model"` it is on; if it contains `modelId: model?.id ?? "no-model"` it is off. If it recognizes neither, it warns and touches nothing (safety).
  This is deliberate: in recent gentle-pi releases the string `${model.provider}/${model.id}` also appears elsewhere in the file (for example, in the adaptive-reasoning key), so a bare-substring match would always report "already patched" and the toggle would never act. That is why detection is anchored to the `modelId` field.
- **Target file resolution** (precedence order):
  1. the `PI_SHOW_PROVIDER_GENTLE_PI_TARGET` environment variable;
  2. sibling-package resolution inside the same `node_modules` (works for both global and project-local installs);
  3. default: `~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts`.
- When gentle-pi is updated or reinstalled, the file returns to its original state and you must run `/show-provider-gentle-pi on` again.

## 🧪 Test

```bash
npm test
```

Runs 7 tests over the pure helpers with temporary copies of the file — it **never touches** your real gentle-pi installation.

## 📂 Repository contents

| File | Description |
| --- | --- |
| `extensions/show-provider.ts` | The Pi extension registering `/show-provider-gentle-pi on/off`. |
| `tests/show-provider.test.ts` | Tests for the helpers (idempotency and round-trip). |
| `bashrc` | The `patch-pi-footer` function (the old shell solution); kept for reference. |
| `package.json` | Pi package metadata (`pi.extensions`, `npm test` script). |
| `LICENSE` | MIT license. |
| `README.md` / `README.en.md` | This documentation (Galician / English). |

## 📄 License

[MIT](LICENSE) © 2026 [Alexandre Espinosa Menor](https://github.com/)