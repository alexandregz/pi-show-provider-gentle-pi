# pi-show-provider-gentle-pi

[Versión en galego →](README.md)

Makes **gentle-pi**'s shell bar (the shell for [Pi](https://pi-coding.com)) show `provider / model` instead of just `model`. It does so by patching the core source file directly: `gentle-shell.ts`.

![gentle-pi shell bar showing provider / model](screenshot.png)

## 🔧 Why a core patch?

gentle-pi's shell bar builds the model identifier inside `buildShellBarModel()`, at line 104 of `extensions/gentle-shell.ts`:

```ts
// original
modelId: model?.id ?? "no-model",
```

The repo also ships an extension (`show-provider-gentle-ai.ts`) that tried to intercept `ctx.model` to prefix the provider, but it **does not work on its own**: gentle-pi builds `modelId` directly from its own model object, outside the extension's reach. The reliable fix is to change that line in the core itself, and that is exactly what the `patch-pi-footer` bash function does.

## 📜 The function: `patch-pi-footer`

A bash function that backs up `gentle-shell.ts` and replaces the line with the provider-aware version:

```ts
// after the patch
modelId: model ? `${model.provider}/${model.id}` : "no-model",
```

Contents (shipped in the repo as the `bashrc` file):

```bash
patch-pi-footer() {
  local target="$HOME/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts"
  local ts=$(date +%Y%m%d%H%M%S)
  cp "$target" "${target}.${ts}"

  if [ -f "$target" ]; then
    # '|' separator in sed so the '/' chars in the TS code don't need escaping
    sed -i '' 's|modelId: model?.id ?? "no-model"|modelId: model ? `${model.provider}/${model.id}` : "no-model"|g' "$target"
    echo "✅ Footer de gentle-pi parcheado: agora amosará provider/model"
  else
    echo "❌ Non se atopou o ficheiro en: $target"
  fi
}
```

## 📍 Where to put it

The repo ships the function in a file named `bashrc`. Append its contents to the end of your shell configuration file:

```bash
# option A: copy the file from the repo
cp bashrc ~/.my-patch-pi-footer.sh
echo "source ~/.my-patch-pi-footer.sh" >> ~/.bashrc

# option B: paste the function directly into your ~/.bashrc (or ~/.zshrc)
```

The function works in both bash and zsh (it uses nothing bash-specific). After adding it, reload your config and run it:

```bash
source ~/.bashrc    # or: source ~/.zshrc
patch-pi-footer
```

Expected output:

```
✅ Footer de gentle-pi parcheado: agora amosará provider/model
```

Restart Pi (or reload extensions) and the shell bar will display something like `anthropic / claude-sonnet-4-…` or `openai / gpt-5-…` instead of only `claude-sonnet-4-…`.

## ⚙️ How it works

1. Defines the `target` variable with the path of the file inside gentle-pi's npm package: `~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts`.
2. Generates a timestamp with `date +%Y%m%d%H%M%S`.
3. **Creates the backup** with `cp` **before touching anything**.
4. Checks the file exists; if not, it warns and exits without doing anything.
5. Applies `sed`, replacing the exact line. It uses `|` as the separator so the `/` characters in the TypeScript code itself don't need escaping.
6. Reports the result on screen.

The patch is **idempotent**: once applied, the search pattern no longer matches the line (the patched version is a different string), so `sed` won't touch anything again. However, **every run creates a new backup**.

## 💾 Backup

- **Where**: in the same directory as the original file, next to it: `~/.pi/agent/npm/node_modules/gentle-pi/extensions/`.
- **Filename format**: `gentle-shell.ts.YYYYMMDDHHMMSS`, where `YYYYMMDDHHMMSS` is the timestamp of the moment the function ran (real example: `gentle-shell.ts.20260912012624`).

List the backups:

```bash
ls -la ~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts.*
```

Revert the patch (restore the latest backup):

```bash
# latest one
cp "$(ls -t ~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts.* | head -1)" \
   ~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts

# or with a specific timestamp
cp ~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts.20260912012624 \
   ~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts
```

## ⚠️ Notes

- `sed -i ''` is **BSD sed (macOS)** syntax. On Linux (GNU sed) you must drop the quotes: `sed -i 's|…|…|g' "$target"`.
- The package path is internal to gentle-pi. When you update or reinstall gentle-pi (npm), the file returns to the original version and you **must run `patch-pi-footer` again**.
- The patch is the only working solution while gentle-pi builds `modelId` in the core; an external extension cannot change it.

## 📂 Repository contents

| File | Description |
| --- | --- |
| `bashrc` | The `patch-pi-footer` function (this patch). |
| `show-provider-gentle-ai.ts` | Pi extension that tried to solve this without touching the core; kept for reference, **does not work on its own**. |
| `README.md` / `README.en.md` | This documentation (Galician / English). |

## 📄 License

[MIT](LICENSE) © 2026 [Alexandre Espinosa Menor](https://github.com/)