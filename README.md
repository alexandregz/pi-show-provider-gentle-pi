# pi-show-provider-gentle-pi

[English version →](README.en.md)

Fai que a barra inferior de **gentle-pi** (a shell de [Pi](https://pi-coding.com)) amose `provider / model` en lugar de só `model`. Para logralo, parchea directamente o ficheiro de orixe do core: `gentle-shell.ts`.

![Barra inferior de gentle-pi amosando provider / model](screenshot.png)

## 🔧 Por que un parche do core?

A barra inferior de gentle-pi constrúe o identificador do modelo dentro de `buildShellBarModel()`, na liña 104 de `extensions/gentle-shell.ts`:

```ts
// orixinal
modelId: model?.id ?? "no-model",
```

## 📜 A función: `patch-pi-footer`

Función de bash que fai unha copia de seguridade de `gentle-shell.ts` e substitúe a liña pola versión co provedor:

```ts
// despois do parche
modelId: model ? `${model.provider}/${model.id}` : "no-model",
```

Contido (no repo, ficheiro `bashrc`):

```bash
patch-pi-footer() {
  local target="$HOME/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts"
  local ts=$(date +%Y%m%d%H%M%S)
  cp "$target" "${target}.${ts}"

  if [ -f "$target" ]; then
    # Usamos o separador '|' en sed para non ter que escapar as barras '/' do código TS
    sed -i '' 's|modelId: model?.id ?? "no-model"|modelId: model ? `${model.provider}/${model.id}` : "no-model"|g' "$target"
    echo "✅ Footer de gentle-pi parcheado: agora amosará provider/model"
  else
    echo "❌ Non se atopou o ficheiro en: $target"
  fi
}
```

## 📍 Onde poñela

O repo inclúe a función nun ficheiro chamado `bashrc`. Engade o seu contido ao final do teu ficheiro de configuración do shell:

```bash
# opción A: copiar o ficheiro do repo
cp bashrc ~/.my-patch-pi-footer.sh
echo "source ~/.my-patch-pi-footer.sh" >> ~/.bashrc

# opción B: pegar a función directamente no teu ~/.bashrc (ou ~/.zshrc)
```

A función é compatible con bash e zsh (non usa nada exclusivo de bash). Despois de engadila, recarga a configuración e execútaa:

```bash
source ~/.bashrc    # ou: source ~/.zshrc
patch-pi-footer
```

Saída esperada:

```
✅ Footer de gentle-pi parcheado: agora amosará provider/model
```

Reinicia Pi (ou recarga as extensións) e a barra inferior amosará algo coma `anthropic / claude-sonnet-4-…` ou `openai / gpt-5-…` en lugar de só `claude-sonnet-4-…`.

## ⚙️ Como funciona

1. Define a variable `target` co camiño do ficheiro dentro do paquete npm de gentle-pi: `~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts`.
2. Xera un selo de tempo con `date +%Y%m%d%H%M%S`.
3. **Fai o backup** co `cp` **antes de tocar nada**.
4. Comproba que o ficheiro existe; se non existe, avisa e remata sen facer nada.
5. Aplica o `sed` substituíndo a liña exacta. Usa `|` como separador para non ter que escapar as barras `/` do propio código TypeScript.
6. Informa do resultado en pantalla.

O parche é **idempotente**: se xa se aplicou, o patrón de busca xa non aparece na liña (a versión parcheada é outra cadea), así que `sed` non volve tocar nada. Iso si, **cada execución crea un backup novo**.

## 💾 Backup

- **Onde**: na mesma carpeta que o ficheiro orixinal, xunto a el: `~/.pi/agent/npm/node_modules/gentle-pi/extensions/`.
- **Formato do nome**: `gentle-shell.ts.YYYYMMDDHHMMSS`, onde `YYYYMMDDHHMMSS` é o selo de tempo do momento en que se executou a función (exemplo real: `gentle-shell.ts.20260912012624`).

Listar os backups:

```bash
ls -la ~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts.*
```

Reverter o parche (restaurar o último backup):

```bash
# o máis recente
cp "$(ls -t ~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts.* | head -1)" \
   ~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts

# ou cun selo de tempo concreto
cp ~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts.20260912012624 \
   ~/.pi/agent/npm/node_modules/gentle-pi/extensions/gentle-shell.ts
```

## ⚠️ Notas

- O comando `sed -i ''` é a sintaxe de **BSD sed (macOS)**. En Linux (GNU sed) hai que quitar as comiñas: `sed -i 's|…|…|g' "$target"`.
- O camiño do paquete é interno de gentle-pi. Cando actualices ou reinstales gentle-pi (npm), o ficheiro volverá á versión orixinal e **haberá que volver executar `patch-pi-footer`**.
- O parche é a única solución que funciona mentres gentle-pi monte `modelId` no core; unha extensión externa non o pode alterar.

## 📂 Contido do repo

| Ficheiro | Descrición |
| --- | --- |
| `bashrc` | A función `patch-pi-footer` (este parche). |
| `show-provider-gentle-ai.ts` | Extensión de Pi que intentaba resolver isto sen tocar o core; mantida como referencia, **non funciona por si soa**. |
| `README.md` / `README.en.md` | Esta documentación (galego / inglés). |

## 📄 Licenza

[MIT](LICENSE) © 2026 [Alexandre Espinosa Menor](https://github.com/)
