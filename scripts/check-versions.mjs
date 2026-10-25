// 发布前一致性校验。任何不满足的项都直接退出 1，禁止带着错误版本上 registry。
// 用法：pnpm check:versions（各包的 prepublishOnly 也会调用）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLISHABLE = ['core', 'editor-vue2', 'editor-vue3']
const PRIVATE = ['demo-vue2', 'demo-vue3']

function readPkg(dir) {
  const file = path.join(root, 'packages', dir, 'package.json')
  return { file, pkg: JSON.parse(fs.readFileSync(file, 'utf8')) }
}

const errors = []
const pkgs = PUBLISHABLE.map(readPkg)

// 1. 三个可发布包版本必须完全一致
const versions = new Set(pkgs.map(({ pkg }) => pkg.version))
const list = pkgs.map(({ pkg }) => `${pkg.name}@${pkg.version}`).join(', ')
if (versions.size !== 1) {
  errors.push(`版本不一致：${list}`)
}

// 2. 适配层必须以 workspace 协议依赖 core（发布时由 pnpm 替换成具体版本号）
for (const { pkg } of pkgs.slice(1)) {
  const range = pkg.dependencies?.['@shenjipo/editor-core']
  if (!range?.startsWith('workspace:')) {
    errors.push(
      `${pkg.name} 的 @shenjipo/editor-core 依赖应为 workspace: 协议，实际为 ${range ?? '(缺失)'}`,
    )
  }
}

// 3. scoped 包必须显式声明公开，否则首次发布会被当成 restricted
for (const { pkg } of pkgs) {
  if (pkg.publishConfig?.access !== 'public') {
    errors.push(`${pkg.name} 缺少 publishConfig.access: "public"`)
  }
  if (pkg.private) {
    errors.push(`${pkg.name} 被标记为 private，无法发布`)
  }
}

// 4. demo 必须保持 private，避免误发
for (const dir of PRIVATE) {
  const { pkg } = readPkg(dir)
  if (pkg.private !== true) {
    errors.push(`${pkg.name} 应为 private，防止误发布`)
  }
}

if (errors.length) {
  console.error('✗ 发布前校验失败：\n' + errors.map((e) => `  - ${e}`).join('\n'))
  process.exit(1)
}

console.log(`✓ 发布前校验通过：${list}，demo 保持 private`)
