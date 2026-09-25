/**
 * plug-manager shell API 兼容性验收（无需启动 DSH）
 *
 * 复现原 bug：新一代宿主只提供 shell.execute(spec) → 句柄 → .result()，
 * 而插件调用的是 shell.run(spec)，于是抛 "shell.run is not a function"。
 *
 *   node test-shell-api.mjs
 *   PLUG_MANAGER_ENTRY=/path/to/other/index.js node test-shell-api.mjs   # 对别的副本跑
 */
import assert from 'node:assert/strict'

const TARGET = process.env.PLUG_MANAGER_ENTRY ?? new URL('./index.js', import.meta.url).href

const probeOut = [
  'DSH_HOME_DIR:/home/still/.dsh',
  'CLI_BIN:/home/still/.npm-global/bin/dsh',
  'PNPM:/home/still/.npm-global/bin/pnpm',
  'NODE:/usr/bin/node',
  '',
].join('\n')

const runResult = {
  exitCode: 0,
  signal: null,
  timedOut: false,
  aborted: false,
  timeoutMs: 600000,
  stdout: { text: 'Progress: resolved 1, reused 1, downloaded 0, added 0\nDone in 1.2s\n', truncated: false },
  stderr: { text: '', truncated: false },
  sandbox: { mode: 'danger-full-access', denied: false },
}

function makeCtx(services) {
  const tools = new Map()
  return {
    ctx: {
      webServer: { register() {} },
      tools: { register(tool) { tools.set(tool.name, tool) } },
      systemPrompt: { context() {} },
      get: (name) => services[name],
    },
    tools,
  }
}

/** 新一代：execute(spec) → 句柄 → result()。没有 run。 */
function newGenShell(log) {
  return {
    resolve(request) { log.resolve.push(request); return { ...request, workdir: request.workdir ?? '/home/still/.dsh', onExpiry: 'kill' } },
    async execute(spec) {
      log.specs.push(spec)
      return { result: async () => { log.resultCalls += 1; return runResult } }
    },
    // 故意不定义 run，模拟当前 DSH
  }
}

/** 旧一代：只有 run(spec)，直接返回结果。 */
function legacyShell(log) {
  return {
    resolve(request) { return { ...request, workdir: request.workdir ?? '/home/still/.dsh' } },
    async run() { log.legacyRuns += 1; return runResult },
  }
}

const baseServices = (shell, log) => ({
  shell,
  sandboxPolicy: { resolve: () => ({ mode: 'danger-full-access', workspaceRoot: '/home/still/dsh-home' }) },
  approval: { request: async () => { log.approvals += 1; return 'allowed-once' } },
  fs: undefined,
})

async function loadTool(services) {
  const { ctx, tools } = makeCtx(services)
  const mod = await import(TARGET)
  mod.apply(ctx, {})
  const tool = tools.get('plug_remove')
  assert.ok(tool !== undefined, 'plug_remove 工具未注册')
  return tool
}

const exec = { agent: { session: {} }, callId: 'call-1', signal: undefined }
const args = { profile: 'web', packageName: 'no-such-plugin-xyz' }

// ---- 用例 1：新一代 API（原来会抛 shell.run is not a function） ----
{
  const log = { resolve: [], specs: [], resultCalls: 0, legacyRuns: 0, approvals: 0 }
  const tool = await loadTool(baseServices(newGenShell(log), log))
  const res = await tool.execute(args, exec)
  assert.equal(log.legacyRuns, 0, '不应走旧 API')
  assert.equal(log.resultCalls, 2, '两次执行都应通过 handle.result() 取结果（环境探测 + dsh plugin）')
  assert.equal(res.ok, true, '命令成功应映射为 ok:true')
  assert.equal(res.exitCode, 0)
  assert.match(res.command, /plugin --profile 'web' 'remove' 'no-such-plugin-xyz'/)
  assert.ok(log.specs.every((s) => typeof s.workdir === 'string' && s.workdir !== ''), 'spec 必须已 resolve 出 workdir')
  assert.equal(log.specs[1].sandboxPolicy.mode, 'danger-full-access', '提权后的策略应传给执行')
  console.log('用例 1 新一代 execute/result  ✓  result() 调用', log.resultCalls, '次，run 调用 0 次')
}

// ---- 用例 2：旧一代 API 仍可用（向后兼容） ----
{
  const log = { resolve: [], specs: [], resultCalls: 0, legacyRuns: 0, approvals: 0 }
  const tool = await loadTool(baseServices(legacyShell(log), log))
  const res = await tool.execute(args, exec)
  assert.equal(log.legacyRuns, 2, '旧宿主应走 run()')
  assert.equal(res.ok, true)
  console.log('用例 2 旧一代 run() 兼容  ✓  run 调用', log.legacyRuns, '次')
}

// ---- 用例 3：窄沙箱 + 审批通道 ----
{
  const log = { resolve: [], specs: [], resultCalls: 0, legacyRuns: 0, approvals: 0 }
  const services = baseServices(newGenShell(log), log)
  services.sandboxPolicy = { resolve: () => ({ mode: 'workspace-write', workspaceRoot: '/home/still/dsh-home', sessionId: 's1' }) }
  const tool = await loadTool(services)
  const res = await tool.execute(args, exec)
  assert.equal(log.approvals, 1, '窄沙箱下必须先请求审批')
  assert.equal(res.ok, true)
  assert.equal(log.specs[1].sandboxPolicy.mode, 'danger-full-access')
  console.log('用例 3 窄沙箱 → 审批 → 提权执行  ✓  审批', log.approvals, '次')
}

// ---- 用例 4：两代都没有 → 清晰的错误 ----
{
  const log = { resolve: [], specs: [], resultCalls: 0, legacyRuns: 0, approvals: 0 }
  const shell = { resolve: (r) => r }
  const tool = await loadTool(baseServices(shell, log))
  await assert.rejects(() => tool.execute(args, exec), (err) => {
    assert.match(String(err.message), /execute\(\)|run\(\)|不兼容/)
    return true
  })
  // runDshPlugin 抛出的错误会由工具层包装；这里只确认不是 "is not a function"
  console.log('用例 4 缺 API 时报明确错误而非 TypeError  ✓')
}

console.log('\n全部通过')
process.exit(0)
