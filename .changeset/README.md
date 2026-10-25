# Changesets

`@shenjipo/editor-core`、`@shenjipo/editor-vue2`、`@shenjipo/editor-vue3` 在 `config.json` 的 `fixed` 组里，
三包版本永远相同、一起发布。

## 发版流程

```bash
# 1. 记录改动（选 patch / minor / major，只需勾一个包，fixed 组会自动同步到三个）
pnpm changeset

# 2. 统一版本号：改写三个 package.json + 生成 CHANGELOG + 更新 lock
pnpm version:packages

# 3. 上传前预演（校验 + dry-run，不真正发布）
pnpm release:dry

# 4. 提交版本变更后发布（版本校验 → pnpm publish -r → 打 tag）
pnpm release
```

## 注意

- **发布必须走 `pnpm -r publish`**，不能直接用 `changeset publish`：后者默认调用 npm publish，
  不会把 `workspace:*` 重写成具体版本号，会导致外部用户装不上。
- `release` 里的 `check:versions` 会校验三包版本一致，并确认内部依赖仍是 `workspace:` 协议。
- scoped 包首次发布默认 restricted，三个包已经通过 `publishConfig.access: "public"` 设成公开。
