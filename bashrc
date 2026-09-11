# o final o mellor é facer un alias e cambiar gentle-shell.ts FISICAMENTE
# ==========================================================================
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
