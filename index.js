/**
 * dsh-plug-manager — 宿主插件。
 *
 * DeepSeek Harness 插件管理器：
 *
 * - 发现：搜索带 `dsh-plugin` topic 标签的 GitHub 仓库（生态的可发现性
 *   标签），并检查单个仓库（package.json 的 `dsh.bundle` 声明、prepare
 *   脚本提示、README）。
 * - 本地 JSON API（`/plug-mgr/*`），供本 bundle 的浏览器端调用。
 * - 模型工具 `plug_install` / `plug_remove` / `plug_update`，执行规范的
 *   `dsh plugin --profile <name> add|remove|update` 操作。profile 目录位于
 *   DSH_HOME 之下、所有会话工作区之外，因此较窄的会话沙箱会在执行前通过
 *   审批服务升级到 danger-full-access。
 * - 待处理请求队列：Marketplace UI 排队一个操作，agent 在提示词上下文中
 *   看到它，并通过工具完成它。
 *
 * 零运行时依赖：核心注册面（webServer、tools、systemPrompt）声明在
 * `inject` 中让 fiber 等待它们，其余服务在使用时通过 ctx.get 读取。
 * GitHub 抓取默认直连；配置代理后经由系统 curl 走代理（支持
 * http/https/socks5/socks5h/socks4），代理来源优先级：持久设置（UI 写入
 * $DSH_HOME/plug-manager.json）> 插件配置（patch config.proxy）> 环境变量。
 * @module dsh-plug-manager
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const GH_API = 'https://api.github.com'
const GH_RAW = 'https://raw.githubusercontent.com'
const GH_CODELOAD = 'https://codeload.github.com'
const SRC_DIR_NAME = '.plug-manager-src'
const SRC_MAX_BYTES = 50 * 1024 * 1024
const REPO_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/
const PROFILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const NAME_RE = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const UNSAFE_RE = /[\u0000-\u001f\u007f'`;|&$<>(){}[\]\\]/
const PER_PAGE = 10

export const name = 'plug-manager'

// 硬依赖：Cordis 会让该 fiber 保持 PENDING 直到三者全部存在，因此 apply()
// 不会与服务注册竞态（在 apply 时用 ctx.get() 读取可能得到 undefined 并
// 静默跳过全部注册）。其余服务在使用时通过 ctx.get() 惰性解析。
export const inject = ['webServer', 'tools', 'systemPrompt']

export function apply(ctx, config) {
  const webServer = ctx.webServer
  const tools = ctx.tools
  const systemPrompt = ctx.systemPrompt

  const pending = new Map()
  let pendingSeq = 0
  let envPromise

  // ------------------------------------------------------------------ proxy
  // 代理来源优先级：持久设置（UI 写入 $DSH_HOME/plug-manager.json）>
  // 插件配置（patch config.proxy）> 环境变量。值为 '' 表示显式强制直连。
  // 代理请求经由系统 curl 发出（支持 http/https/socks5/socks5h/socks4），
  // 直连请求用 Node fetch。
  const SETTINGS_FILE = 'plug-manager.json'
  function dshHomeDir() {
    return typeof process.env.DSH_HOME === 'string' && process.env.DSH_HOME !== ''
      ? process.env.DSH_HOME
      : join(homedir(), '.dsh')
  }
  const configProxy = config !== null && typeof config === 'object' && typeof config.proxy === 'string'
    ? config.proxy.trim() : ''
  let persistedProxy // undefined = 未设置；'' = 强制直连；其余为代理 URL
  try {
    const persisted = JSON.parse(readFileSync(join(dshHomeDir(), SETTINGS_FILE), 'utf8'))
    if (persisted !== null && typeof persisted === 'object' && typeof persisted.proxy === 'string') {
      persistedProxy = persisted.proxy
    }
  } catch { /* 尚无持久设置 */ }

  /** 把代理设置写入 $DSH_HOME/plug-manager.json；value === undefined 表示删除该项。 */
  async function saveProxySetting(value) {
    const path = join(dshHomeDir(), SETTINGS_FILE)
    let data = {}
    try {
      const parsed = JSON.parse(await readFile(path, 'utf8'))
      if (parsed !== null && typeof parsed === 'object') data = parsed
    } catch { /* 新建 */ }
    if (value === undefined) delete data.proxy
    else data.proxy = value
    await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
  }

  const PROXY_SCHEME_RE = /^(https?|socks5h?|socks4a?):\/\/[^\s'"<>\\]+$/i
  const PROXY_ENV_KEYS = ['DSH_PLUG_MANAGER_PROXY', 'HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']

  function resolveProxy() {
    if (persistedProxy !== undefined) {
      return { proxy: persistedProxy, source: persistedProxy === '' ? '持久设置（强制直连）' : '持久设置' }
    }
    if (configProxy !== '') return { proxy: configProxy, source: '插件配置（patch config.proxy）' }
    for (const key of PROXY_ENV_KEYS) {
      const value = process.env[key]
      if (typeof value === 'string' && value.trim() !== '') return { proxy: value.trim(), source: '环境变量 ' + key }
    }
    return { proxy: '', source: '未配置（直连）' }
  }

  let curlOk
  function probeCurl() {
    if (curlOk !== undefined) return curlOk
    try {
      curlOk = spawnSync('curl', ['--version'], { timeout: 5000 }).status === 0
    } catch { curlOk = false }
    return curlOk
  }

  function curlFetch(url, proxy) {
    return new Promise((resolvePromise, rejectPromise) => {
      const args = [
        '-sS', '-L',
        '--max-time', '30',
        '--connect-timeout', '10',
        '--max-filesize', String(GH_FETCH_MAX_BYTES),
        '-x', proxy,
        '-H', 'User-Agent: dsh-plug-manager/0.1',
        '-H', 'Accept: application/vnd.github+json, application/json;q=0.9, */*;q=0.8',
        '-w', '\n__DSH_PLUG_MGR_STATUS__:%{http_code}',
        url,
      ]
      let child
      try {
        child = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] })
      } catch (error) {
        rejectPromise(new Error('无法启动 curl：' + (error instanceof Error ? error.message : String(error))))
        return
      }
      const chunks = []
      let bytes = 0
      let stderrText = ''
      let settled = false
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        if (!settled) { settled = true; rejectPromise(new Error('GitHub 请求超时（代理 ' + proxy + '）：' + url)) }
      }, 35000)
      child.stdout.on('data', (chunk) => {
        bytes += chunk.length
        if (bytes > GH_FETCH_MAX_BYTES + 1024) {
          child.kill('SIGKILL')
          if (!settled) { settled = true; clearTimeout(timer); rejectPromise(new Error('GitHub 响应过大：' + url)) }
          return
        }
        chunks.push(chunk)
      })
      child.stderr.on('data', (chunk) => { stderrText = (stderrText + chunk.toString('utf8')).slice(-1000) })
      child.on('error', (error) => {
        if (!settled) { settled = true; clearTimeout(timer); rejectPromise(new Error('curl 调用失败：' + error.message)) }
      })
      child.on('close', (code) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (code !== 0) {
          const hints = { 5: '无法解析代理', 7: '无法连接代理', 28: '超时', 35: 'TLS 错误', 56: '接收失败', 60: 'SSL 证书错误', 63: '响应超过大小上限' }
          const hint = hints[code] !== undefined ? '（' + hints[code] + '）' : ''
          const detail = stderrText.trim() !== '' ? stderrText.trim() : 'curl 退出码 ' + code
          rejectPromise(new Error('代理请求失败' + hint + '：' + detail))
          return
        }
        const text = Buffer.concat(chunks).toString('utf8')
        const marker = '\n__DSH_PLUG_MGR_STATUS__:'
        const at = text.lastIndexOf(marker)
        const statusText = at >= 0 ? text.slice(at + marker.length).trim() : ''
        const body = at >= 0 ? text.slice(0, at) : text
        const status = Number(statusText)
        resolvePromise({ status: Number.isFinite(status) && status > 0 ? status : 200, body })
      })
    })
  }

  // ---------------------------------------------------------------- helpers
  function clip(value, max) {
    if (typeof value !== 'string') return ''
    return value.length > max ? value.slice(0, max) + ' …[已截断]' : value
  }
  function tail(value, max) {
    if (typeof value !== 'string') return ''
    return value.length > max ? '…[已省略开头] ' + value.slice(value.length - max) : value
  }
  function safeArg(value, label) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 300) {
      throw new Error(label + '：应为非空字符串（最多 300 字符）')
    }
    if (UNSAFE_RE.test(value)) throw new Error(label + '：包含不支持的字符')
    return value
  }
  function q(value) { return "'" + value + "'" }
  function assertProfile(value) {
    const profile = safeArg(String(value ?? ''), 'profile')
    if (!PROFILE_RE.test(profile)) throw new Error('profile：无效的 profile 名称：' + profile)
    return profile
  }
  function classifySpec(spec) {
    if (/^github:[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*(#[A-Za-z0-9][A-Za-z0-9._/-]*)?$/.test(spec)) return 'github'
    if (/^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(@[A-Za-z0-9._-]+)?$/.test(spec)) return 'npm'
    if (/^git\+(https|http|ssh):\/\/[A-Za-z0-9._:/@#?&=%~+-]+$/.test(spec)) return 'git-url'
    if (/^https:\/\/[A-Za-z0-9._:/@#?&=%~+-]+\.(tgz|tar\.gz)$/.test(spec)) return 'tarball-url'
    if (spec.startsWith('/') || spec.startsWith('~/') || spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('file:') || spec.startsWith('link:')) return 'path'
    return undefined
  }
  function isBundleManifest(manifest) {
    return manifest !== null && typeof manifest === 'object'
      && manifest.dsh !== null && typeof manifest.dsh === 'object'
      && manifest.dsh.bundle !== null && typeof manifest.dsh.bundle === 'object'
      && typeof manifest.dsh.bundle.patch === 'string'
  }

  /** 从任意 GitHub URL 中提取 owner/repo（无法识别时返回 ''）。 */
  function githubFullNameFromUrl(url) {
    if (typeof url !== 'string') return ''
    const m = /github\.com[/:]([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i.exec(url)
    if (m === null) return ''
    return m[1].replace(/\.git$/i, '').replace(/\/+$/, '')
  }

  /** 从安装源中提取 github:owner/repo（非 github 源返回 ''）。 */
  function githubFullNameFromSpec(spec) {
    if (typeof spec !== 'string') return ''
    const gh = /^github:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:#|$)/.exec(spec)
    if (gh !== null) return gh[1].replace(/\.git$/i, '')
    if (/^git\+(https|http|ssh):\/\//i.test(spec)) return githubFullNameFromUrl(spec)
    return ''
  }

  /** 把 manifest 的 repository 字段规范化为 https 仓库地址（失败返回 ''）。 */
  function repoUrlFromManifest(manifest) {
    if (manifest === null || typeof manifest !== 'object') return ''
    const repo = manifest.repository
    let url = ''
    if (typeof repo === 'string') url = repo
    else if (repo !== null && typeof repo === 'object' && typeof repo.url === 'string') url = repo.url
    if (typeof url !== 'string' || url === '') return ''
    if (/^github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/.test(url)) url = 'https://github.com/' + url.slice(7)
    else if (/^git@github\.com:/i.test(url)) url = 'https://github.com/' + url.slice('git@github.com:'.length)
    else url = url.replace(/^git\+/, '')
    if (!/^https?:\/\//i.test(url)) return ''
    return url.replace(/\.git$/i, '').replace(/\/+$/, '')
  }

  /** 已安装依赖的补充元数据：版本 / 描述 / 许可证 / 主页 / GitHub 链接 / prepare 脚本。 */
  function depInfo(depManifest, spec) {
    const info = { version: '', description: '', license: '', homepage: '', repoUrl: '', githubFullName: '', hasPrepare: false }
    if (depManifest === null || typeof depManifest !== 'object') {
      info.githubFullName = githubFullNameFromSpec(spec)
      return info
    }
    if (typeof depManifest.version === 'string') info.version = depManifest.version
    if (typeof depManifest.description === 'string') info.description = depManifest.description.slice(0, 300)
    const license = depManifest.license
    if (typeof license === 'string') info.license = license
    else if (license !== null && typeof license === 'object' && typeof license.type === 'string') info.license = license.type
    if (typeof depManifest.homepage === 'string') info.homepage = depManifest.homepage
    info.repoUrl = repoUrlFromManifest(depManifest)
    info.hasPrepare = depManifest.scripts !== null && typeof depManifest.scripts === 'object' && typeof depManifest.scripts.prepare === 'string'
    info.githubFullName = githubFullNameFromSpec(spec)
      || (info.repoUrl !== '' ? githubFullNameFromUrl(info.repoUrl) : '')
      || githubFullNameFromUrl(info.homepage)
    return info
  }

  // 出厂组合刻意不挂载任何 web fetch provider（SSRF 立场：模型不应自选抓取
  // 目标，见 dsh-base 的 web 行注释），因此 web.fetch 在默认部署中不可用。
  // 本插件的抓取目标全部是宿主控制的 GitHub 端点（api.github.com /
  // raw.githubusercontent.com），由正则校验过的仓库名拼接而成，故直接抓取，
  // 并在本地强制等价限制：30 秒超时、5 MB 响应上限、10 万字符文本上限。
  const GH_FETCH_TIMEOUT_MS = 30000
  const GH_FETCH_MAX_BYTES = 5 * 1024 * 1024
  const GH_FETCH_MAX_CHARS = 100000

  /** 直连抓取（Node fetch），返回 { status, body }。 */
  async function directFetch(url) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), GH_FETCH_TIMEOUT_MS)
    let res
    try {
      res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'user-agent': 'dsh-plug-manager/0.1',
          'accept': 'application/vnd.github+json, application/json;q=0.9, */*;q=0.8',
        },
      })
    } catch (error) {
      if (error !== null && typeof error === 'object' && error.name === 'AbortError') {
        throw new Error('GitHub 请求超时（' + GH_FETCH_TIMEOUT_MS + 'ms）：' + url)
      }
      throw new Error('GitHub 请求失败：' + url + ' — ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      clearTimeout(timer)
    }
    const reader = res.body.getReader()
    const chunks = []
    let bytes = 0
    for (;;) {
      const part = await reader.read()
      if (part.done === true) break
      bytes += part.value.byteLength
      if (bytes > GH_FETCH_MAX_BYTES) {
        await reader.cancel()
        throw new Error('GitHub 响应过大（超过 ' + GH_FETCH_MAX_BYTES + ' 字节）：' + url)
      }
      chunks.push(part.value)
    }
    const merged = new Uint8Array(bytes)
    let offset = 0
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength }
    return { status: res.status, body: new TextDecoder('utf-8').decode(merged) }
  }

  /** 按生效代理选择通道：配置了代理走 curl，否则直连。 */
  async function httpGet(url) {
    const { proxy } = resolveProxy()
    if (proxy === '') return await directFetch(url)
    if (probeCurl() !== true) {
      throw new Error('已配置代理（' + proxy + '），但宿主未找到 curl，无法经代理访问；请安装 curl 或清除代理设置')
    }
    return await curlFetch(url, proxy)
  }

  async function ghFetch(url) {
    const { status, body } = await httpGet(url)
    if (status !== 200) {
      throw new Error('GitHub 返回 HTTP ' + status + '（' + url + '）' + (body !== '' ? ' — ' + clip(body, 200) : ''))
    }
    if (body.length > GH_FETCH_MAX_CHARS) {
      throw new Error('GitHub 响应文本过长（超过 ' + GH_FETCH_MAX_CHARS + ' 字符）：' + url)
    }
    return body
  }
  async function ghJson(url) {
    const text = await ghFetch(url)
    try { return JSON.parse(text) } catch (error) {
      if (error instanceof SyntaxError) throw new Error('来自 ' + url + ' 的 JSON 无效')
      throw error
    }
  }

  /**
   * 尝试把 `github:owner/repo[#ref]` 解析为等价的 npm 包 spec。
   *
   * 背景：pnpm 会把 `github:` 简写解析成 git+ssh，在没有 GitHub SSH key 的
   * 机器上必然失败；而 git 安装拿到的是源码（无构建产物），还要求宿主能跑
   * 包的 prepare 构建。如果该仓库的 package.json 同名包已发布到 npm 注册表，
   * 从 npm 安装既免 git/SSH，也带预构建产物——严格更稳。
   *
   * 成功返回 { spec, note }；任何环节失败返回 null（调用方沿用原 spec）。
   * 注意：这里只向 npm 注册表「查证」包名与版本；真正的下载由 pnpm 按用户
   * 自己配置的 registry 完成。
   */
  async function resolveGitHubSpec(spec) {
    try {
      const m = /^github:([A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*)(?:#([A-Za-z0-9][A-Za-z0-9._/-]*))?$/.exec(spec)
      if (m === null) return null
      const fullName = m[1]
      const ref = typeof m[2] === 'string' ? m[2] : ''
      const repo = await ghJson(GH_API + '/repos/' + fullName)
      const branch = typeof repo.default_branch === 'string' && repo.default_branch !== '' ? repo.default_branch : 'main'
      const manifest = JSON.parse(await ghFetch(GH_RAW + '/' + fullName + '/' + (ref !== '' ? ref : branch) + '/package.json'))
      const npmName = typeof manifest.name === 'string' ? manifest.name.trim() : ''
      if (npmName === '' || !NAME_RE.test(npmName)) return null
      let meta = null
      for (const registry of ['https://registry.npmjs.org/', 'https://registry.npmmirror.com/']) {
        try { meta = JSON.parse(await ghFetch(registry + encodeURIComponent(npmName))); break } catch { /* 尝试下一个注册表 */ }
      }
      const versions = meta !== null && typeof meta === 'object' && typeof meta.versions === 'object' && meta.versions !== null ? meta.versions : {}
      if (Object.keys(versions).length === 0) return null
      if (ref === '') {
        return { spec: npmName, note: 'github: 直装需要 SSH 且从源码构建，已改用 npm 包 ' + npmName + '（latest，对应该仓库的发布版本）' }
      }
      const versionish = ref.startsWith('v') ? ref.slice(1) : ref
      if (Object.prototype.hasOwnProperty.call(versions, versionish) === true) {
        return { spec: npmName + '@' + versionish, note: '已改用 npm 包 ' + npmName + '@' + versionish + '（对应 tag ' + ref + '；github: 直装需要 SSH 且从源码构建）' }
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * 经 HTTPS 把远端文件下载到本地（代理走 curl -o，直连用 fetch）。
   * 与 GitHub API 请求共享代理配置；上限 SRC_MAX_BYTES、180 秒超时。
   */
  async function downloadToFile(url, destPath) {
    const { proxy } = resolveProxy()
    if (proxy !== '') {
      if (probeCurl() !== true) {
        throw new Error('已配置代理（' + proxy + '），但宿主未找到 curl，无法经代理下载')
      }
      await new Promise((resolvePromise, rejectPromise) => {
        const args = [
          '-x', proxy,
          '-sS', '-L',
          '--max-time', '180',
          '--connect-timeout', '15',
          '--max-filesize', String(SRC_MAX_BYTES),
          '-H', 'User-Agent: dsh-plug-manager/0.1',
          '-o', destPath,
          '-w', '%{http_code}',
          url,
        ]
        let child
        try {
          child = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] })
        } catch (error) {
          rejectPromise(new Error('无法启动 curl：' + (error instanceof Error ? error.message : String(error))))
          return
        }
        let out = ''
        let stderrText = ''
        let settled = false
        const timer = setTimeout(() => {
          child.kill('SIGKILL')
          if (settled !== true) { settled = true; rejectPromise(new Error('下载超时（180 秒，代理 ' + proxy + '）：' + url)) }
        }, 190000)
        child.stdout.on('data', (chunk) => { out += chunk.toString('utf8') })
        child.stderr.on('data', (chunk) => { stderrText = (stderrText + chunk.toString('utf8')).slice(-1000) })
        child.on('error', (error) => {
          if (settled !== true) { settled = true; clearTimeout(timer); rejectPromise(new Error('curl 调用失败：' + error.message)) }
        })
        child.on('close', (code) => {
          if (settled === true) return
          settled = true
          clearTimeout(timer)
          const status = Number(out.trim())
          if (code === 0 && status === 200) { resolvePromise(); return }
          const hints = { 5: '无法解析代理', 7: '无法连接代理', 28: '超时', 35: 'TLS 错误', 56: '接收失败', 60: 'SSL 证书错误', 63: '响应超过大小上限' }
          const hint = hints[code] !== undefined ? '（' + hints[code] + '）' : ''
          const detail = stderrText.trim() !== '' ? stderrText.trim() : 'curl 退出码 ' + code
          rejectPromise(new Error('下载失败' + hint + '：HTTP ' + (Number.isFinite(status) && status > 0 ? status : '未知') + ' — ' + detail))
        })
      })
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 180000)
    try {
      const res = await fetch(url, { signal: controller.signal, redirect: 'follow' })
      if (res.status !== 200) throw new Error('下载失败：HTTP ' + res.status + ' — ' + url)
      const declared = Number(res.headers.get('content-length') ?? '0')
      if (declared > SRC_MAX_BYTES) throw new Error('源码包过大（超过 50 MB）：' + url)
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.byteLength > SRC_MAX_BYTES) throw new Error('源码包过大（超过 50 MB）：' + url)
      await writeFile(destPath, buffer)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('下载超时（180 秒）：' + url)
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  /** 为解压后的源码安装其声明的运行时依赖（在源码目录内执行 npm install）。
   * 源码包以 file:/link: 目录依赖装入 profile，Node 按真实路径（即源码目录）
   * 解析其中的裸导入——依赖必须装在源码目录自身的 node_modules 里，否则
   * DSH 启动 import 该插件时报 ERR_MODULE_NOT_FOUND（whale-girl 缺
   * schemastery 即此问题）。失败时抛错，阻止把坏组合装入 profile。 */
  async function installSourceDependencies(dir, log) {
    let manifest
    try {
      manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
    } catch {
      return
    }
    const deps = manifest.dependencies !== null && typeof manifest.dependencies === 'object' ? Object.keys(manifest.dependencies) : []
    if (deps.length === 0) {
      log('该源码包未声明运行时依赖，跳过依赖安装\n')
      return
    }
    log('源码包声明了 ' + deps.length + ' 个运行时依赖（' + deps.slice(0, 6).join(', ') + (deps.length > 6 ? '…' : '') + '），先在源码目录内安装…\n')
    // 刻意不注入本插件的 GitHub 代理设置：那是给 GitHub 端点用的，强加给
    // npm 可能反而破坏注册表连接（实测 7897 代理对 npm registry TLS 不兼容）。
    // npm 用自己的配置体系（npm config / .npmrc）；宿主环境里已有的
    // HTTP(S)_PROXY 等变量会随 process.env 自然继承。
    const args = ['install', '--omit=dev', '--legacy-peer-deps', '--no-audit', '--no-fund']
    const result = await new Promise((resolvePromise) => {
      let out = ''
      const child = spawn('npm', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] })
      child.stdout.on('data', (chunk) => { out += String(chunk); if (out.length > 48 * 1024) out = out.slice(-48 * 1024) })
      child.stderr.on('data', (chunk) => { out += String(chunk); if (out.length > 48 * 1024) out = out.slice(-48 * 1024) })
      const timer = setTimeout(() => { child.kill('SIGKILL') }, 600000)
      child.on('close', (code) => { clearTimeout(timer); resolvePromise({ code, out }) })
      child.on('error', (error) => { clearTimeout(timer); resolvePromise({ code: -1, out: out + '\n' + String(error) }) })
    })
    if (result.code !== 0) {
      throw new Error('源码依赖安装失败（npm install 退出码 ' + result.code + '）：' + result.out.slice(-1500) + '\n为避免「装完启动即崩溃」，该插件未装入 profile；可配置代理后重试。')
    }
    log('源码依赖安装完成（' + dir + '/node_modules）\n')
  }

  /**
   * `github:` 源且无可发布的 npm 包时的源码安装路径：经 HTTPS 从
   * codeload.github.com 下载 tarball（自动走代理配置），解压到
   * $DSH_HOME/.plug-manager-src/<owner>--<repo>，返回本地目录作为安装源。
   * 全程不用 git，彻底避开 pnpm 把 github:/git+https 转成 git+ssh 的问题。
   * @param {string} spec - `github:owner/repo[#ref]`
   * @param {(text: string) => void} log - 进度输出（可传空函数）
   */
  async function downloadGitHubSource(spec, log) {
    const m = /^github:([A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*)(?:#([A-Za-z0-9][A-Za-z0-9._/-]*))?$/.exec(spec)
    if (m === null) throw new Error('无效的 github: 源：' + spec)
    const fullName = m[1]
    let ref = typeof m[2] === 'string' && m[2] !== '' ? m[2] : ''
    if (ref === '') {
      try {
        const repo = await ghJson(GH_API + '/repos/' + fullName)
        ref = typeof repo.default_branch === 'string' && repo.default_branch !== '' ? repo.default_branch : 'main'
      } catch {
        ref = 'main' // 拿不到默认分支（限流/离线）时用 main 兜底
      }
    }
    log('未发布 npm 包，改经 HTTPS 下载源码 ' + fullName + '@' + ref + '（codeload.github.com，不经 git/SSH）…\n')
    const srcRoot = join(dshHomeDir(), SRC_DIR_NAME)
    const dirName = fullName.replace('/', '--')
    const dir = join(srcRoot, dirName)
    const tarball = join(srcRoot, dirName + '.tar.gz')
    mkdirSync(srcRoot, { recursive: true })
    const candidates = [GH_CODELOAD + '/' + fullName + '/tar.gz/' + ref]
    if (ref.indexOf('/') !== -1) candidates.push(GH_CODELOAD + '/' + fullName + '/tar.gz/refs/heads/' + ref)
    let lastError = null
    for (const url of candidates) {
      try {
        await downloadToFile(url, tarball)
        lastError = null
        break
      } catch (error) {
        lastError = error
      }
    }
    if (lastError !== null) {
      rmSync(tarball, { force: true })
      throw new Error('源码下载失败：' + (lastError instanceof Error ? lastError.message : String(lastError)) + '。若网络受限，请在「GitHub 代理」中配置代理后重试。')
    }
    try {
      rmSync(dir, { recursive: true, force: true })
      mkdirSync(dir, { recursive: true })
      const tar = spawnSync('tar', ['-xzf', tarball, '-C', dir, '--strip-components=1'], { timeout: 120000 })
      if (tar.status !== 0) throw new Error('解压源码失败（tar 退出码 ' + tar.status + '）')
      const manifestRaw = await readFile(join(dir, 'package.json'), 'utf8').catch(() => '')
      if (manifestRaw === '') throw new Error('源码根目录缺少 package.json，不像有效的 DSH 插件仓库')
    } finally {
      rmSync(tarball, { force: true })
    }
    log('源码已解压到 ' + dir + '\n')
    await installSourceDependencies(dir, log)
    return { path: dir, ref }
  }

  /** 探测 DSH 主目录、dsh CLI 入口、pnpm/node（只读）。 */
  /** 纯 Node 的 PATH 探测（不执行任何命令）。 */
  function findInPath(binary) {
    const pathEnv = typeof process.env.PATH === 'string' ? process.env.PATH : ''
    const sep = process.platform === 'win32' ? ';' : ':'
    for (const dir of pathEnv.split(sep)) {
      if (dir === '') continue
      const candidates = process.platform === 'win32'
        ? [join(dir, binary + '.cmd'), join(dir, binary + '.exe'), join(dir, binary)]
        : [join(dir, binary)]
      for (const candidate of candidates) {
        try {
          if (existsSync(candidate)) return candidate
        } catch { /* 个别目录不可读时跳过继续找 */ }
      }
    }
    return null
  }

  /** 不走 shell 服务的环境探测：沙箱后端缺失（如未安装 bubblewrap 的 Linux
   * 服务部署）时 shell 会拒绝执行探测命令，此处退化为只读的文件系统探测，
   * 保证插件市场页面可用。 */
  function discoverEnvViaNode() {
    const env = { dshHome: '', cli: { kind: 'missing', value: '' }, pnpm: '', node: '' }
    env.dshHome = process.env.DSH_HOME !== undefined && process.env.DSH_HOME !== '' ? process.env.DSH_HOME : join(homedir(), '.dsh')
    const cliBin = findInPath('dsh')
    if (cliBin !== null) {
      env.cli = { kind: 'bin', value: cliBin }
    } else {
      for (const d of [process.env.INIT_CWD, process.env.PNPM_SCRIPT_SRC_DIR]) {
        if (typeof d === 'string' && d !== '' && existsSync(join(d, 'apps/cli/lib/bin.js'))) {
          env.cli = { kind: 'src', value: d }
          break
        }
      }
    }
    const pnpmBin = findInPath('pnpm')
    if (pnpmBin !== null) env.pnpm = pnpmBin
    const nodeBin = findInPath('node')
    env.node = nodeBin !== null ? nodeBin : process.execPath
    return env
  }

  // shell 服务的前台执行有前后两代形状：新一代是
  // `execute(spec)` 返回进程句柄、再由 `handle.result()` 给出 ShellRunResult；
  // 旧一代（本插件 v0.3.x 编写时的形状）是 `run(spec)` 直接返回结果。
  // 只认 `run` 会在新一代宿主上抛 "shell.run is not a function"，只认
  // `execute` 又会在旧宿主上失败，因此两代都容忍。
  async function runShellSpec(shell, spec) {
    if (typeof shell.execute === 'function') {
      const execution = await shell.execute(spec)
      return typeof execution.result === 'function' ? execution.result() : execution
    }
    if (typeof shell.run === 'function') return shell.run(spec)
    throw new Error('shell 服务既没有 execute() 也没有 run()：当前 DSH 版本与插件不兼容')
  }

  function discoverEnv() {
    if (envPromise !== undefined) return envPromise
    envPromise = (async () => {
      const shell = ctx.get('shell')
      if (shell !== undefined) {
        try {
          const command = [
            'printf "DSH_HOME_DIR:%s\\n" "${DSH_HOME:-$HOME/.dsh}"',
            'if command -v dsh >/dev/null 2>&1; then printf "CLI_BIN:%s\\n" "$(command -v dsh)"; else for d in "${INIT_CWD:-}" "${PNPM_SCRIPT_SRC_DIR:-}"; do if [ -n "$d" ] && [ -f "$d/apps/cli/lib/bin.js" ]; then printf "CLI_SRC:%s\\n" "$d"; break; fi; done; fi',
            'if command -v pnpm >/dev/null 2>&1; then printf "PNPM:%s\\n" "$(command -v pnpm)"; fi',
            'if command -v node >/dev/null 2>&1; then printf "NODE:%s\\n" "$(command -v node)"; fi',
          ].join('\n')
          const result = await runShellSpec(shell, shell.resolve({ command, timeoutMs: 15000, stdoutMaxBytes: 8192 }))
          const text = result.stdout !== undefined ? result.stdout.text : ''
          const env = { dshHome: '', cli: { kind: 'missing', value: '' }, pnpm: '', node: '' }
          for (const line of text.split('\n')) {
            if (line.startsWith('DSH_HOME_DIR:')) env.dshHome = line.slice(13).trim()
            else if (line.startsWith('CLI_BIN:')) env.cli = { kind: 'bin', value: line.slice(8).trim() }
            else if (line.startsWith('CLI_SRC:')) env.cli = { kind: 'src', value: line.slice(8).trim() }
            else if (line.startsWith('PNPM:')) env.pnpm = line.slice(5).trim()
            else if (line.startsWith('NODE:')) env.node = line.slice(5).trim()
          }
          if (env.dshHome === '') throw new Error('无法从环境确定 DSH_HOME')
          return env
        } catch { /* shell 探测失败（如 SANDBOX_UNAVAILABLE）→ 纯 Node 兜底 */ }
      }
      return discoverEnvViaNode()
    })()
    envPromise.catch(() => { envPromise = undefined })
    return envPromise
  }

  async function scanProfiles(env) {
    const fsSvc = ctx.get('fs')
    if (fsSvc === undefined) return []
    const profiles = []
    let entries
    try {
      entries = await fsSvc.listDir(await fsSvc.resolve(env.dshHome + '/profiles'))
    } catch { return [] }
    for (const entry of entries) {
      if (entry.type !== 'directory' || entry.name.startsWith('.')) continue
      const dir = env.dshHome + '/profiles/' + entry.name
      let manifest
      try { manifest = JSON.parse(await fsSvc.readText(await fsSvc.resolve(dir + '/package.json'))) } catch { continue }
      const dependencies = manifest.dependencies !== null && typeof manifest.dependencies === 'object' ? manifest.dependencies : {}
      const deps = []
      for (const depName of Object.keys(dependencies)) {
        const spec = String(dependencies[depName])
        let depManifest = null
        try {
          depManifest = JSON.parse(await fsSvc.readText(await fsSvc.resolve(dir + '/node_modules/' + depName + '/package.json')))
        } catch { depManifest = null }
        deps.push(Object.assign(
          { name: depName, spec, isBundle: depManifest !== null && isBundleManifest(depManifest) },
          depInfo(depManifest, spec),
        ))
      }
      profiles.push({
        name: entry.name,
        bundles: manifest.dsh !== null && typeof manifest.dsh === 'object'
          && manifest.dsh.profile !== null && typeof manifest.dsh.profile === 'object'
          && Array.isArray(manifest.dsh.profile.bundles) ? manifest.dsh.profile.bundles.map(String) : [],
        dependencies: deps,
      })
    }
    return profiles
  }

  function trimRepo(item) {
    return {
      fullName: String(item.full_name ?? ''),
      url: String(item.html_url ?? ''),
      description: typeof item.description === 'string' ? item.description.slice(0, 300) : '',
      stars: typeof item.stargazers_count === 'number' ? item.stargazers_count : 0,
      language: typeof item.language === 'string' ? item.language : '',
      updatedAt: String(item.updated_at ?? ''),
      archived: item.archived === true,
      fork: item.fork === true,
      owner: item.owner !== null && typeof item.owner === 'object'
        ? { login: String(item.owner.login ?? ''), avatar: String(item.owner.avatar_url ?? '') }
        : { login: '', avatar: '' },
    }
  }

  function phrase(op, key, profile) {
    if (op === 'install') return '将插件 ' + key + ' 安装到 profile ' + profile
    if (op === 'remove') return '从 profile ' + profile + ' 移除插件 ' + key
    return '更新 profile ' + profile + ' 中的插件 ' + key
  }
  function addPending(entry) {
    pendingSeq += 1
    const id = 'req-' + pendingSeq
    pending.set(id, Object.assign({ id, at: Date.now() }, entry))
    return id
  }
  function listPending() {
    const items = []
    for (const entry of pending.values()) {
      items.push({ id: entry.id, op: entry.op, profile: entry.profile, key: entry.key, at: entry.at, phrase: entry.phrase })
    }
    return items
  }
  function fulfilPending(op, profile, key) {
    for (const entry of pending.values()) {
      if (entry.op === op && entry.profile === profile && entry.key === key) pending.delete(entry.id)
    }
  }

  // ------------------------------------- 特权 `dsh plugin` 执行器
  /**
   * 执行一次 `dsh plugin --profile <p> <pnpm args...>`。DSH_HOME 下的
   * profile 目录位于所有会话工作区之外，因此当常驻沙箱模式窄于
   * danger-full-access 时，会先通过审批服务征询用户（失败即关闭：
   * 未获批准则不执行）。
   */
  async function runDshPlugin(exec, toolName, profile, pnpmArgs, humanSummary) {
    const shell = ctx.get('shell')
    const sandboxPolicy = ctx.get('sandboxPolicy')
    const approval = ctx.get('approval')
    if (shell === undefined) throw new Error('shell 服务不可用')
    if (sandboxPolicy === undefined) throw new Error('sandboxPolicy 服务不可用')
    const env = await discoverEnv()
    if (env.cli.kind === 'missing') {
      throw new Error('未找到 dsh CLI：PATH 中没有 `dsh`，也未通过 INIT_CWD/PNPM_SCRIPT_SRC_DIR 检测到源码检出')
    }
    if (env.pnpm === '') {
      throw new Error('PATH 中未找到 pnpm — `dsh plugin` 依赖 pnpm 执行，必须先安装')
    }
    const launcher = env.cli.kind === 'bin'
      ? q(env.cli.value)
      : q(env.node !== '' ? env.node : 'node') + ' ' + q(env.cli.value + '/apps/cli/lib/bin.js')
    const command = launcher + ' plugin --profile ' + q(profile) + ' ' + pnpmArgs.map(q).join(' ')
    const session = exec.agent !== undefined && exec.agent !== null ? exec.agent.session : undefined
    const standing = sandboxPolicy.resolve(session !== undefined ? { session } : {})
    let mode = standing.mode
    if (mode !== 'danger-full-access') {
      if (approval === undefined || exec.agent === undefined) {
        throw new Error('该操作将写入 ' + env.dshHome + ' 下的 profile 目录（会话工作区之外），需要 danger-full-access，但当前没有可用的审批通道。')
      }
      const outcome = await approval.request({
        agent: exec.agent,
        toolName,
        callId: exec.callId,
        signal: exec.signal,
        reason: humanSummary
          + '\n命令：' + command
          + '\n需要 danger-full-access：profile 目录（' + env.dshHome + '/profiles/' + profile + '）位于会话工作区之外。注意：git 类型的安装源在安装时可能执行包的 prepare 脚本。',
      })
      if (outcome !== 'allowed-once') throw new Error('未获批准（' + outcome + '）')
      mode = 'danger-full-access'
    }
    const policy = { mode, workspaceRoot: standing.workspaceRoot }
    if (standing.sessionId !== undefined) policy.sessionId = standing.sessionId
    const spec = shell.resolve({
      command,
      workdir: env.dshHome,
      timeoutMs: 600000,
      stdoutMaxBytes: 512 * 1024,
      sandboxPolicy: policy,
    })
    const result = await runShellSpec(shell, spec)
    return {
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      timedOut: result.timedOut === true,
      sandboxDenied: result.sandbox !== undefined && result.sandbox !== null && result.sandbox.denied === true,
      command,
      stdout: tail(result.stdout !== undefined ? result.stdout.text : '', 6000),
      stderr: tail(result.stderr !== undefined ? result.stderr.text : '', 3000),
    }
  }

  // ------------------------------------------------- UI 直接执行的任务系统
  // Marketplace UI 里的「申请安装 / 更新 / 移除」由用户本人在本地界面发起，
  // 等同于用户自己敲命令——宿主直接执行 dsh CLI 并把输出流式反馈给页面，
  // 不再排队等 agent。agent 工具面（上方 runDshPlugin）保留审批不变。
  const jobs = new Map()
  let jobSeq = 0
  const JOB_OUTPUT_MAX = 48 * 1024
  const JOB_TIMEOUT_MS = 600000

  let hostEnvPromise
  /** 向上查找含 scripts.dsh 的 package.json，定位 harness 检出根目录。 */
  function findHarnessRoot(startDir) {
    let dir = startDir
    for (let i = 0; i < 10; i++) {
      try {
        const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
        if (manifest !== null && typeof manifest === 'object'
          && manifest.scripts !== null && typeof manifest.scripts === 'object'
          && typeof manifest.scripts.dsh === 'string') return dir
      } catch { /* 不是这一层 */ }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    return null
  }
  function probePath(name) {
    try {
      const probe = spawnSync('sh', ['-c', 'command -v ' + name], { timeout: 5000 })
      return probe.status === 0 ? probe.stdout.toString('utf8').trim() : ''
    } catch { return '' }
  }
  /**
   * 宿主侧定位 DSH_HOME 与 dsh CLI（不走 shell 服务，不经沙箱）。
   * 启动方式多样：全局 dsh、node lib/bin.js、pnpm dsh（tsx 跑 .ts 源码）——
   * 逐一探测：PATH 的 dsh → 进程入口 js → 检出根的 tsx 源码入口 / 编译产物 /
   * pnpm dsh。launcher 可带自己的 cwd（pnpm/tsx 需要在检出根下运行）。
   */
  function hostEnv() {
    if (hostEnvPromise !== undefined) return hostEnvPromise
    hostEnvPromise = (async () => {
      const dshHome = dshHomeDir()
      let launcher = null
      const dshOnPath = probePath('dsh')
      if (dshOnPath !== '') launcher = { cmd: dshOnPath, args: [], label: dshOnPath }
      const entryRaw = typeof process.argv[1] === 'string' ? process.argv[1] : ''
      const entry = entryRaw !== '' ? resolve(process.cwd(), entryRaw) : ''
      if (launcher === null && entry !== '' && /\.(c|m)?js$/.test(entry) && existsSync(entry)) {
        launcher = { cmd: process.execPath, args: [entry], label: entry }
      }
      if (launcher === null && entry !== '') {
        const root = findHarnessRoot(dirname(entry))
        if (root !== null) {
          if (entry.endsWith('.ts')) {
            // pnpm dsh 的实际形态：node --import tsx/esm apps/cli/src/bin.ts
            launcher = { cmd: process.execPath, args: ['--import', 'tsx/esm', entry], cwd: root, label: 'node --import tsx/esm ' + entry }
          } else {
            const libBin = join(root, 'apps', 'cli', 'lib', 'bin.js')
            if (existsSync(libBin)) launcher = { cmd: process.execPath, args: [libBin], label: libBin }
          }
          if (launcher === null) {
            const pnpmPath = probePath('pnpm')
            if (pnpmPath !== '') launcher = { cmd: pnpmPath, args: ['dsh'], cwd: root, label: 'pnpm dsh（' + root + '）' }
          }
        }
      }
      if (launcher === null) {
        const pnpmPath = probePath('pnpm')
        if (pnpmPath !== '') launcher = { cmd: pnpmPath, args: ['dsh'], label: 'pnpm dsh' }
      }
      if (launcher === null) {
        throw new Error('找不到 dsh CLI：PATH 无 dsh、进程入口不可用、也未找到 pnpm。请安装 pnpm 或把 dsh 加入 PATH。')
      }
      return { dshHome, launcher }
    })()
    hostEnvPromise.catch(() => { hostEnvPromise = undefined })
    return hostEnvPromise
  }

  function appendOutput(job, text) {
    job.output += text
    if (job.output.length > JOB_OUTPUT_MAX) job.output = job.output.slice(job.output.length - JOB_OUTPUT_MAX)
  }
  function finishJob(job, code) {
    if (job.status !== 'running') return
    job.exitCode = code
    job.status = code === 0 ? 'success' : 'error'
    job.finishedAt = Date.now()
  }
  function jobSnapshot(job) {
    return {
      id: job.id, op: job.op, profile: job.profile, spec: job.spec, note: job.note,
      status: job.status, exitCode: job.exitCode,
      output: tail(job.output, 8000),
      startedAt: job.startedAt, finishedAt: job.finishedAt,
    }
  }
  function pruneJobs() {
    if (jobs.size <= 30) return
    const finished = []
    for (const job of jobs.values()) if (job.status !== 'running') finished.push(job)
    finished.sort((a, b) => a.startedAt - b.startedAt)
    while (jobs.size > 30 && finished.length > 0) jobs.delete(finished.shift().id)
  }

  function runChild(job, cmd, args, cwd) {
    return new Promise((resolvePromise) => {
      let child
      try {
        child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], cwd })
      } catch (error) {
        appendOutput(job, '[plug-manager] 无法启动 ' + cmd + '：' + (error instanceof Error ? error.message : String(error)) + '\n')
        finishJob(job, 127)
        resolvePromise()
        return
      }
      job.child = child
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        appendOutput(job, '\n[plug-manager] 操作超时（' + Math.round(JOB_TIMEOUT_MS / 60000) + ' 分钟），已强制终止\n')
      }, JOB_TIMEOUT_MS)
      child.stdout.on('data', (chunk) => appendOutput(job, chunk.toString('utf8')))
      child.stderr.on('data', (chunk) => appendOutput(job, chunk.toString('utf8')))
      child.on('error', (error) => {
        clearTimeout(timer)
        appendOutput(job, '\n[plug-manager] 启动 ' + cmd + ' 失败：' + error.message + (error.code === 'ENOENT' ? '（命令不存在）' : '') + '\n')
        finishJob(job, 127)
        resolvePromise()
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        job.child = null
        finishJob(job, typeof code === 'number' ? code : 1)
        resolvePromise()
      })
    })
  }

  /** npm 包名去掉版本后缀：'a@1.0.0' → 'a'，'@s/a@1.0.0' → '@s/a'。 */
  function stripVersion(spec) {
    const at = spec.lastIndexOf('@')
    if (at > 0) return spec.slice(0, at)
    return spec
  }

  /**
   * npm 兜底安装后的 bundle 登记：复刻 dsh CLI 的 reconcile —— 依赖列表中
   * 声明 dsh.bundle.patch 的包追加进 dsh.profile.bundles（已存在则跳过）。
   */
  async function reconcileBundlesAfterNpm(profileDir) {
    const manifestPath = join(profileDir, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    const dependencies = manifest !== null && typeof manifest.dependencies === 'object' && manifest.dependencies !== null
      ? Object.keys(manifest.dependencies) : []
    if (manifest.dsh === undefined || manifest.dsh === null || typeof manifest.dsh !== 'object') manifest.dsh = {}
    if (manifest.dsh.profile === undefined || manifest.dsh.profile === null || typeof manifest.dsh.profile !== 'object') manifest.dsh.profile = {}
    const bundles = Array.isArray(manifest.dsh.profile.bundles) ? manifest.dsh.profile.bundles : []
    let changed = false
    for (const name of dependencies) {
      try {
        const depManifest = JSON.parse(await readFile(join(profileDir, 'node_modules', ...name.split('/'), 'package.json'), 'utf8'))
        const isBundle = depManifest.dsh !== undefined && depManifest.dsh !== null
          && depManifest.dsh.bundle !== undefined && depManifest.dsh.bundle !== null
          && typeof depManifest.dsh.bundle.patch === 'string'
        if (isBundle === true && bundles.includes(name) === false) { bundles.push(name); changed = true }
      } catch { /* 依赖不可读或非 bundle，跳过 */ }
    }
    if (changed === true) {
      manifest.dsh.profile.bundles = bundles
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
    }
    return changed
  }

  /**
   * pnpm 7 × 新版 Node 的注册表抓取不兼容（ERR_INVALID_THIS）时的兜底：
   * 改用 npm 完成安装（npm 的 github: 简写走 HTTPS，无需 SSH），随后手动
   * 登记 bundle 层（npm 不会跑 dsh CLI 的 reconcile）。
   */
  async function npmFallbackInstall(job, env, spec) {
    appendOutput(job, '\n[plug-manager] 检测到 pnpm 注册表抓取错误（ERR_INVALID_THIS，pnpm 7 与当前 Node 不兼容）——改用 npm 重试…\n')
    job.status = 'running'
    job.exitCode = null
    const profileDir = join(env.dshHome, 'profiles', job.profile)
    const manifestPath = join(profileDir, 'package.json')
    // npm 不认 pnpm 的 link: 协议（EUNSUPPORTEDPROTOCOL）。临时把 link: 依赖
    // 改写成语义等价的 file:（目录符号链接），npm 完成后再还原回 link:。
    const linkDeps = []
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
      for (const section of ['dependencies', 'devDependencies']) {
        const deps = manifest !== null && manifest[section] !== null && typeof manifest[section] === 'object' ? manifest[section] : null
        if (deps === null) continue
        for (const name of Object.keys(deps)) {
          if (typeof deps[name] === 'string' && deps[name].startsWith('link:')) {
            linkDeps.push({ section, name, original: deps[name] })
            deps[name] = 'file:' + deps[name].slice('link:'.length)
          }
        }
      }
      if (linkDeps.length > 0) {
        appendOutput(job, '[plug-manager] profile 含 npm 不支持的 link: 依赖（' + linkDeps.map((d) => d.name).join('、') + '），临时改写为 file:，完成后还原\n')
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
      }
    } catch (error) {
      appendOutput(job, '[plug-manager] 读写 profile 清单失败，直接尝试 npm：' + (error instanceof Error ? error.message : String(error)) + '\n')
    }
    try {
      const npmArgs = ['install', spec, '--no-audit', '--no-fund']
      appendOutput(job, '$ npm ' + npmArgs.join(' ') + '\n')
      await runChild(job, 'npm', npmArgs, profileDir)
      if (job.exitCode !== 0 && job.output.indexOf('EPERM') !== -1 && job.output.indexOf('cache') !== -1) {
        // npm cache 目录权限异常时用临时 cache 再试一次
        appendOutput(job, '\n[plug-manager] npm cache 不可写，改用临时 cache 重试…\n')
        job.status = 'running'
        job.exitCode = null
        const retryArgs = npmArgs.concat(['--cache', join(env.dshHome, '.plug-mgr-npm-cache')])
        appendOutput(job, '$ npm ' + retryArgs.join(' ') + '\n')
        await runChild(job, 'npm', retryArgs, profileDir)
      }
    } finally {
      if (linkDeps.length > 0) {
        try {
          const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
          for (const item of linkDeps) {
            if (manifest[item.section] !== null && typeof manifest[item.section] === 'object') manifest[item.section][item.name] = item.original
          }
          await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
        } catch (error) {
          appendOutput(job, '\n[plug-manager] 警告：link: 依赖还原失败，请检查 ' + manifestPath + '：' + (error instanceof Error ? error.message : String(error)) + '\n')
        }
      }
    }
    if (job.exitCode !== 0) return
    try {
      const changed = await reconcileBundlesAfterNpm(profileDir)
      appendOutput(job, changed === true
        ? '\n[plug-manager] 已把新 bundle 登记到 profile 的 dsh.profile.bundles\n'
        : '\n[plug-manager] 依赖已安装（未发现新的 dsh.bundle 层需要登记）\n')
    } catch (error) {
      appendOutput(job, '\n[plug-manager] 登记 bundle 层失败：' + (error instanceof Error ? error.message : String(error)) + '\n')
      job.status = 'error'
      job.exitCode = 1
      job.finishedAt = Date.now()
      return
    }
    finishJob(job, 0)
  }

  /** 读取 profile 中某依赖的安装源 spec（不存在或读取失败返回 ''）。 */
  async function readDepSpec(profile, packageName) {
    try {
      const manifest = JSON.parse(await readFile(join(dshHomeDir(), 'profiles', profile, 'package.json'), 'utf8'))
      if (manifest.dependencies !== null && typeof manifest.dependencies === 'object' && typeof manifest.dependencies[packageName] === 'string') {
        return manifest.dependencies[packageName]
      }
    } catch { /* manifest 不可读时按未知源处理 */ }
    return ''
  }

  /** 安装成功后的校验：确认实际包名、依赖登记、bundle 声明与 bundle 层
   * 注册状态——把「安装成功但 DSH 不会加载」的情况明确报出来
   * （如 core-dsh-plugins：仓库带 dsh-plugin topic 但包本身没有
   * dsh.bundle.patch 声明，只能作为普通依赖存在）。返回日志行。 */
  async function finishInstall(profile, installSpec) {
    const notes = []
    let packageName = ''
    let pkgManifest = null
    try {
      if (installSpec.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(installSpec) || installSpec.startsWith('file:') || installSpec.startsWith('link:')) {
        const rawPath = installSpec.replace(/^(file|link):/, '')
        pkgManifest = JSON.parse(await readFile(join(rawPath, 'package.json'), 'utf8'))
      } else {
        const nameMatch = /^(@[^@\s/]+\/[^@\s]+|[^@\s./][^@\s]*)/.exec(installSpec)
        packageName = nameMatch !== null ? nameMatch[1] : ''
      }
    } catch { /* 读取失败时保留空名，跳过后续校验 */ }
    if (pkgManifest !== null && typeof pkgManifest.name === 'string' && pkgManifest.name !== '') packageName = pkgManifest.name
    if (packageName === '') return notes
    let inDeps = false
    let inBundles = false
    try {
      const manifest = JSON.parse(await readFile(join(dshHomeDir(), 'profiles', profile, 'package.json'), 'utf8'))
      const deps = manifest.dependencies !== null && typeof manifest.dependencies === 'object' ? manifest.dependencies : {}
      inDeps = deps[packageName] !== undefined
      const dsh = manifest.dsh !== null && typeof manifest.dsh === 'object' ? manifest.dsh : {}
      const profileCfg = dsh.profile !== null && typeof dsh.profile === 'object' ? dsh.profile : {}
      inBundles = Array.isArray(profileCfg.bundles) && profileCfg.bundles.indexOf(packageName) !== -1
    } catch {
      notes.push('实际包名：' + packageName + '（无法回读 profile manifest 验证登记状态）')
      return notes
    }
    let hasBundle
    if (pkgManifest !== null) {
      hasBundle = isBundleManifest(pkgManifest)
    } else {
      hasBundle = false
      try {
        hasBundle = isBundleManifest(JSON.parse(await readFile(join(dshHomeDir(), 'profiles', profile, 'node_modules', ...packageName.split('/'), 'package.json'), 'utf8')))
      } catch { /* 已安装 manifest 不可读时按无声明处理 */ }
    }
    notes.push('实际包名：' + packageName)
    if (!inDeps) notes.push('警告：' + packageName + ' 未出现在 profile 依赖中——安装可能未生效')
    if (!hasBundle) {
      notes.push('警告：' + packageName + ' 未声明 dsh.bundle.patch——仅作为普通依赖安装，DSH 不会加载它（该仓库不是标准 DSH 插件包，可考虑移除）')
    } else if (!inBundles) {
      notes.push('警告：' + packageName + ' 声明了 dsh.bundle 但未登记到 bundle 层——DSH 不会加载它')
    } else {
      notes.push('已登记到 bundle 层 ✓ — 重启 DSH 后加载')
    }
    return notes
  }

  /** 移除成功后的收尾：验证依赖与 bundle 层确已移除，并清理 plug-manager
   * 下载的本地源码目录（.plug-manager-src/<owner>--<repo>）。返回日志行。 */
  async function finishRemove(profile, packageName, removedSpec) {
    const notes = []
    const profileDir = join(dshHomeDir(), 'profiles', profile)
    try {
      const after = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8'))
      const deps = after.dependencies !== null && typeof after.dependencies === 'object' ? after.dependencies : {}
      const dsh = after.dsh !== null && typeof after.dsh === 'object' ? after.dsh : {}
      const profileCfg = dsh.profile !== null && typeof dsh.profile === 'object' ? dsh.profile : {}
      const bundles = Array.isArray(profileCfg.bundles) ? profileCfg.bundles : []
      if (deps[packageName] !== undefined || bundles.indexOf(packageName) !== -1) {
        notes.push('警告：manifest 中仍残留 ' + packageName
          + '（依赖：' + (deps[packageName] !== undefined ? '在' : '已移除')
          + '，bundle 层：' + (bundles.indexOf(packageName) !== -1 ? '在' : '已移除') + '）— 移除可能未彻底完成')
      } else {
        notes.push('已验证：' + packageName + ' 不再出现在依赖与 bundle 层中')
      }
    } catch {
      notes.push('无法回读 profile manifest 验证移除结果')
    }
    // 清理源码安装的本地目录：spec 形如 file:../../.plug-manager-src/<dir>
    // 或 link:/abs/.../.plug-manager-src/<dir>；只删 DSH 主目录下的该目录。
    if (typeof removedSpec === 'string' && removedSpec.indexOf(SRC_DIR_NAME + '/') !== -1) {
      const segments = removedSpec.split(/[/\\]/).filter((part) => part !== '' && part !== '.' && part !== '..')
      const dirName = segments.length > 0 ? segments[segments.length - 1] : ''
      if (/^[A-Za-z0-9_.-]+$/.test(dirName) && dirName !== '.' && dirName !== '..') {
        const srcDir = join(dshHomeDir(), SRC_DIR_NAME, dirName)
        try {
          rmSync(srcDir, { recursive: true, force: true })
          notes.push('已清理本地源码目录：' + srcDir)
        } catch (error) {
          notes.push('清理本地源码目录失败（' + srcDir + '）：' + (error instanceof Error ? error.message : String(error)))
        }
      }
    }
    return notes
  }

  /** 启动一个 UI 直接执行的任务；立即返回 job（异步执行中）。 */
  async function startPluginJob(op, profile, key) {
    const env = await hostEnv()
    const id = 'job-' + (++jobSeq)
    const job = {
      id, op, profile,
      spec: key,
      originalSpec: key,
      note: '', status: 'running', output: '', exitCode: null,
      startedAt: Date.now(), finishedAt: null, child: null,
    }
    jobs.set(id, job)
    pruneJobs()
    // 异步执行，不阻塞路由响应
    void (async () => {
      try {
        if (op === 'install') {
          // github: 源解析：优先等价的 npm 包；未发布则经 HTTPS 下载源码
          // tarball 并按本地路径安装——全程不用 git（pnpm 会把 github: 转成
          // git+ssh，没有 SSH key 的机器必然失败）。
          let installSpec = key
          if (classifySpec(key) === 'github') {
            const resolved = await resolveGitHubSpec(key)
            if (resolved !== null) {
              installSpec = resolved.spec
              job.note = resolved.note
            } else {
              const src = await downloadGitHubSource(key, (text) => appendOutput(job, text))
              installSpec = src.path
              job.note = '未发布 npm 包，已经 HTTPS 下载源码 ' + key.slice('github:'.length) + '@' + src.ref + '，按本地路径安装（不经 git/SSH）'
            }
            job.spec = installSpec
          }
          const args = ['plugin', '--profile', profile, 'add', '-w', installSpec]
          appendOutput(job, '$ ' + env.launcher.label + ' ' + args.join(' ') + '\n')
          await runChild(job, env.launcher.cmd, env.launcher.args.concat(args), env.launcher.cwd !== undefined ? env.launcher.cwd : env.dshHome)
          if (job.exitCode === 0) {
            appendOutput(job, '\n[plug-manager] 安装成功 — 重启 DSH 后组合新 bundle 层\n')
            for (const note of await finishInstall(profile, installSpec)) appendOutput(job, '[plug-manager] ' + note + '\n')
          } else if (job.output.indexOf('ERR_INVALID_THIS') !== -1) {
            await npmFallbackInstall(job, env, installSpec)
            if (job.status === 'success') {
              appendOutput(job, '\n[plug-manager] 安装成功（npm 兜底）— 重启 DSH 后组合新 bundle 层\n')
              for (const note of await finishInstall(profile, installSpec)) appendOutput(job, '[plug-manager] ' + note + '\n')
            }
          }
        } else if (op === 'remove') {
          // 彻底移除：先记录安装源 → CLI 移除（pnpm remove + bundle 对账）→
          // 验证 manifest 结果 → 清理 plug-manager 下载的本地源码目录。
          const removedSpec = await readDepSpec(profile, key)
          const args = ['plugin', '--profile', profile, 'remove', key]
          appendOutput(job, '$ ' + env.launcher.label + ' ' + args.join(' ') + '\n')
          await runChild(job, env.launcher.cmd, env.launcher.args.concat(args), env.launcher.cwd !== undefined ? env.launcher.cwd : env.dshHome)
          if (job.exitCode === 0) {
            appendOutput(job, '\n[plug-manager] 移除成功 — 重启 DSH 后系统不再加载该插件\n')
            for (const note of await finishRemove(profile, key, removedSpec)) appendOutput(job, '[plug-manager] ' + note + '\n')
          }
        } else {
          const args = key !== '' ? ['plugin', '--profile', profile, 'update', key] : ['plugin', '--profile', profile, 'update']
          appendOutput(job, '$ ' + env.launcher.label + ' ' + args.join(' ') + '\n')
          await runChild(job, env.launcher.cmd, env.launcher.args.concat(args), env.launcher.cwd !== undefined ? env.launcher.cwd : env.dshHome)
          if (job.exitCode === 0) appendOutput(job, '\n[plug-manager] 更新成功 — 重启 DSH 后生效\n')
        }
      } catch (error) {
        appendOutput(job, '\n[plug-manager] 执行出错：' + (error instanceof Error ? error.message : String(error)) + '\n')
        finishJob(job, job.exitCode !== null ? job.exitCode : 1)
      }
    })()
    return job
  }

  // -------------------------------------------------------- 模型工具面
  const RESULT_SCHEMA = {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      summary: { type: 'string' },
      error: { type: 'string' },
      exitCode: { type: 'number' },
      command: { type: 'string' },
      stdout: { type: 'string' },
      stderr: { type: 'string' },
      timedOut: { type: 'boolean' },
      sandboxDenied: { type: 'boolean' },
      op: { type: 'string' },
    },
    required: ['ok'],
  }

  function renderToolResult(_args, value) {
    const lines = []
    if (value.ok === true) lines.push('成功 — ' + String(value.summary ?? '完成'))
    else lines.push('失败' + (typeof value.error === 'string' && value.error !== '' ? ' — ' + value.error : '（退出码 ' + String(value.exitCode ?? '?') + '）'))
    if (typeof value.command === 'string' && value.command !== '') lines.push('命令：' + value.command)
    if (value.timedOut === true) lines.push('已超时。')
    if (value.sandboxDenied === true) lines.push('[sandbox: 文件访问被拒绝]')
    if (typeof value.stdout === 'string' && value.stdout !== '') lines.push('--- stdout（尾部）---\n' + value.stdout)
    if (typeof value.stderr === 'string' && value.stderr !== '') lines.push('--- stderr（尾部）---\n' + value.stderr)
    if (value.ok === true && value.op === 'install') lines.push('请重启 DSH 以组合新安装的 bundle。')
    return [{ type: 'text', text: lines.join('\n') }]
  }

  function objectArgs(rawArgs) {
    return rawArgs !== null && typeof rawArgs === 'object' ? rawArgs : {}
  }

  tools.register({
    name: 'plug_install',
    description: '通过 `dsh plugin add` 把一个 DeepSeek Harness 插件（profile bundle）安装到 dsh profile。安装源格式：npm 包名[@版本]、github:owner/repo[#ref]、git+<url>、.tgz 压缩包 URL，或绝对/本地路径。由于 DSH_HOME 下的 profile 目录位于会话工作区之外，当会话沙箱较窄时，本工具会请求用户批准以 danger-full-access 运行。安装成功后必须重启 DSH 才能组合新 bundle。',
    parameters: {
      type: 'object',
      properties: {
        profile: { type: 'string', description: 'Profile 名称，例如 "web"。' },
        spec: { type: 'string', description: '安装源：npm 包名、github:owner/repo[#ref]、git URL、压缩包 URL 或路径。' },
      },
      required: ['profile', 'spec'],
    },
    output: { schema: RESULT_SCHEMA, render: renderToolResult },
    timeoutMs: 660000,
    isConcurrencySafe: () => false,
    execute: async (rawArgs, exec) => {
      const args = objectArgs(rawArgs)
      const profile = assertProfile(args.profile)
      const spec = safeArg(String(args.spec ?? ''), 'spec')
      if (classifySpec(spec) === undefined) {
        throw new Error('不支持的安装源格式：' + spec + '（应为 npm 包名[@版本]、github:owner/repo[#ref]、git+<url>、.tgz URL 或路径）')
      }
      // github: 源优先解析为等价的 npm 包（若已发布）；未发布则经 HTTPS 下载
      // 源码 tarball 按本地路径安装。pnpm 会把 github: 简写转成 git+ssh，没有
      // SSH key 的机器必然失败——两条兜底都绕开 git。
      let installSpec = spec
      let installNote = ''
      if (classifySpec(spec) === 'github') {
        const resolved = await resolveGitHubSpec(spec)
        if (resolved !== null) {
          installSpec = resolved.spec
          installNote = resolved.note
        } else {
          const src = await downloadGitHubSource(spec, () => {})
          installSpec = src.path
          installNote = '未发布 npm 包，已经 HTTPS 下载源码 ' + spec.slice('github:'.length) + '@' + src.ref + '，按本地路径安装（不经 git/SSH）'
        }
      }
      // profile 目录本身是 pnpm workspace 根目录；pnpm 7 对不带 -w 的根目录
      // add 报 ERR_PNPM_ADDING_TO_ROOT，因此这里显式带上 -w。
      const reason = installSpec !== spec
        ? '将 DSH 插件 "' + spec + '" 安装到 profile "' + profile + '"（' + installNote + '，实际安装 ' + installSpec + '）。'
        : '将 DSH 插件 "' + spec + '" 安装到 profile "' + profile + '"。'
      const result = await runDshPlugin(exec, 'plug_install', profile, ['add', '-w', installSpec], reason)
      result.op = 'install'
      if (result.ok === true) {
        fulfilPending('install', profile, spec)
        result.summary = '已将 ' + installSpec + ' 安装到 profile ' + profile + (installNote !== '' ? ' — ' + installNote : '') + ' — 请重启 DSH 使其生效'
      }
      return result
    },
  })

  tools.register({
    name: 'plug_remove',
    description: '通过 `dsh plugin remove` 从 dsh profile 移除已安装的插件（包依赖 + bundle 层）。需要沙箱提权时会请求用户批准。之后需重启 DSH 才能移除该层。',
    parameters: {
      type: 'object',
      properties: {
        profile: { type: 'string', description: 'Profile 名称，例如 "web"。' },
        packageName: { type: 'string', description: '要移除的已安装 npm 包名。' },
      },
      required: ['profile', 'packageName'],
    },
    output: { schema: RESULT_SCHEMA, render: renderToolResult },
    timeoutMs: 660000,
    isConcurrencySafe: () => false,
    execute: async (rawArgs, exec) => {
      const args = objectArgs(rawArgs)
      const profile = assertProfile(args.profile)
      const packageName = safeArg(String(args.packageName ?? ''), 'packageName')
      if (!NAME_RE.test(packageName)) throw new Error('packageName 必须是 npm 包名：' + packageName)
      const removedSpec = await readDepSpec(profile, packageName)
      const result = await runDshPlugin(exec, 'plug_remove', profile, ['remove', packageName], '从 profile "' + profile + '" 移除插件 "' + packageName + '"。')
      result.op = 'remove'
      if (result.ok === true) {
        fulfilPending('remove', profile, packageName)
        const notes = await finishRemove(profile, packageName, removedSpec)
        result.summary = '已从 profile ' + profile + ' 移除 ' + packageName + '（' + notes.join('；') + '）— 请重启 DSH，系统不再加载该插件'
      }
      return result
    },
  })

  tools.register({
    name: 'plug_update',
    description: '通过 `dsh plugin update`（pnpm update）更新 dsh profile 中已安装的插件。不传 packageName 时更新所有依赖。需要沙箱提权时会请求用户批准。之后需重启 DSH 才能启用新版本。',
    parameters: {
      type: 'object',
      properties: {
        profile: { type: 'string', description: 'Profile 名称，例如 "web"。' },
        packageName: { type: 'string', description: '可选：要更新的已安装包名；省略则更新全部。' },
      },
      required: ['profile'],
    },
    output: { schema: RESULT_SCHEMA, render: renderToolResult },
    timeoutMs: 660000,
    isConcurrencySafe: () => false,
    execute: async (rawArgs, exec) => {
      const args = objectArgs(rawArgs)
      const profile = assertProfile(args.profile)
      const pnpmArgs = ['update']
      let key = '*'
      if (args.packageName !== undefined && String(args.packageName) !== '') {
        key = safeArg(String(args.packageName), 'packageName')
        if (!NAME_RE.test(key)) throw new Error('packageName 必须是 npm 包名：' + key)
        pnpmArgs.push(key)
      }
      const result = await runDshPlugin(exec, 'plug_update', profile, pnpmArgs, '更新 profile "' + profile + '" 中的插件 "' + key + '"。')
      result.op = 'update'
      if (result.ok === true) {
        fulfilPending('update', profile, key)
        result.summary = '已更新 profile ' + profile + ' 中的 ' + key + ' — 请重启 DSH 以启用新版本'
      }
      return result
    },
  })

  // --------------------------------------------------- 本地 JSON API 路由
  function sendJson(res, value) {
    const body = JSON.stringify(value)
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(body)
  }
  function route(path, fn) {
    webServer.register({
      kind: 'exact',
      path,
      handler: async (req, res) => {
        try {
          const params = new URL(req.url ?? '/', 'http://plug-mgr.local').searchParams
          sendJson(res, await fn(params))
        } catch (error) {
          sendJson(res, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
      },
    })
  }

  route('/plug-mgr/search', async (params) => {
    const query = (params.get('query') ?? '').trim().slice(0, 100)
    const sortRaw = params.get('sort') ?? ''
    const sort = sortRaw === 'stars' || sortRaw === 'updated' ? sortRaw : ''
    const pageRaw = Number(params.get('page') ?? '1')
    const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw <= 100 ? pageRaw : 1
    let queryText = 'topic:dsh-plugin'
    if (query !== '') queryText += ' ' + query
    let url = GH_API + '/search/repositories?q=' + encodeURIComponent(queryText) + '&per_page=' + PER_PAGE + '&page=' + page + '&order=desc'
    if (sort !== '') url += '&sort=' + sort
    const data = await ghJson(url)
    const items = Array.isArray(data.items) ? data.items : []
    return { ok: true, total: typeof data.total_count === 'number' ? data.total_count : items.length, page, perPage: PER_PAGE, repos: items.map(trimRepo) }
  })

  route('/plug-mgr/repo', async (params) => {
    const fullName = params.get('fullName') ?? ''
    if (!REPO_RE.test(fullName)) return { ok: false, error: '无效的仓库名：' + fullName }
    const repo = await ghJson(GH_API + '/repos/' + fullName)
    const branch = typeof repo.default_branch === 'string' && repo.default_branch !== '' ? repo.default_branch : 'main'
    let manifest = null
    try {
      const parsed = JSON.parse(await ghFetch(GH_RAW + '/' + fullName + '/' + branch + '/package.json'))
      const bundle = isBundleManifest(parsed)
      manifest = {
        name: typeof parsed.name === 'string' ? parsed.name : '',
        version: typeof parsed.version === 'string' ? parsed.version : '',
        description: typeof parsed.description === 'string' ? parsed.description : '',
        hasBundle: bundle,
        patch: bundle ? String(parsed.dsh.bundle.patch) : '',
        hasPrepare: parsed.scripts !== null && typeof parsed.scripts === 'object' && typeof parsed.scripts.prepare === 'string',
        dependencyCount: parsed.dependencies !== null && typeof parsed.dependencies === 'object' ? Object.keys(parsed.dependencies).length : 0,
      }
    } catch { manifest = null }
    let readme = ''
    let readmeName = ''
    for (const candidate of ['README.md', 'readme.md', 'README.zh.md', 'README']) {
      try { readme = await ghFetch(GH_RAW + '/' + fullName + '/' + branch + '/' + candidate); readmeName = candidate; break } catch { /* 尝试下一个 */ }
    }
    return {
      ok: true,
      repo: {
        fullName,
        branch,
        stars: typeof repo.stargazers_count === 'number' ? repo.stargazers_count : 0,
        forks: typeof repo.forks_count === 'number' ? repo.forks_count : 0,
        openIssues: typeof repo.open_issues_count === 'number' ? repo.open_issues_count : 0,
        topics: Array.isArray(repo.topics) ? repo.topics.filter((topic) => typeof topic === 'string').slice(0, 20) : [],
        license: repo.license !== null && typeof repo.license === 'object' && typeof repo.license.spdx_id === 'string' ? repo.license.spdx_id : '',
        homepage: typeof repo.homepage === 'string' ? repo.homepage : '',
        createdAt: String(repo.created_at ?? ''),
        updatedAt: String(repo.updated_at ?? ''),
        archived: repo.archived === true,
      },
      manifest,
      readme: { name: readmeName, text: clip(readme, 20000), truncated: readme.length > 20000 },
      installSpec: 'github:' + fullName,
    }
  })

  route('/plug-mgr/profiles', async () => {
    const env = await discoverEnv()
    return { ok: true, dshHome: env.dshHome, cli: env.cli, pnpm: env.pnpm, profiles: await scanProfiles(env) }
  })

  route('/plug-mgr/request', async (params) => {
    const opRaw = params.get('op') ?? ''
    const op = opRaw === 'install' || opRaw === 'remove' || opRaw === 'update' ? opRaw : ''
    if (op === '') return { ok: false, error: 'op 必须是 install、remove 或 update' }
    const profile = assertProfile(params.get('profile'))
    let key
    if (op === 'install') {
      key = safeArg(params.get('spec') ?? '', 'spec')
      if (classifySpec(key) === undefined) return { ok: false, error: '不支持的安装源格式：' + key }
    } else {
      key = safeArg(params.get('packageName') ?? '', 'packageName')
      if (!NAME_RE.test(key)) return { ok: false, error: 'packageName 必须是 npm 包名：' + key }
    }
    try {
      const job = await startPluginJob(op, profile, key)
      return { ok: true, jobId: job.id, message: '已开始执行「' + phrase(op, key, profile) + '」' }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  route('/plug-mgr/job', async (params) => {
    const id = params.get('id') ?? ''
    const job = jobs.get(id)
    if (job === undefined) return { ok: false, error: '未知任务：' + id }
    if (params.get('cancel') !== null && job.status === 'running' && job.child !== null) {
      appendOutput(job, '\n[plug-manager] 用户请求取消，正在终止进程…\n')
      job.child.kill('SIGTERM')
    }
    return { ok: true, job: jobSnapshot(job) }
  })

  /**
   * 重启 DSH 服务：用当前进程的启动方式（hostEnv launcher + 原始启动参数）
   * 拉起一个分离的替代进程，然后退出当前进程。替代脚本先等旧进程释放端口，
   * 新进程若 6 秒内退出（如端口仍占用）会自动重试。页面侧轮询等待服务恢复
   * 后自动刷新。
   */
  route('/plug-mgr/restart', async (params) => {
    if (params.get('confirm') !== '1') return { ok: false, error: '重启 DSH 需要显式确认（confirm=1）' }
    let env
    try {
      env = await hostEnv()
    } catch (error) {
      return { ok: false, error: '无法重启：' + (error instanceof Error ? error.message : String(error)) }
    }
    const serverArgs = process.argv.slice(2)
    if (serverArgs.length === 0) return { ok: false, error: '无法识别当前服务的启动参数（缺少子命令），重启中止' }
    const launchParts = [env.launcher.cmd].concat(env.launcher.args, serverArgs)
    const quoted = launchParts.map((part) => "'" + String(part).replace(/'/g, "'\\''") + "'").join(' ')
    const cwd = env.launcher.cwd !== undefined ? env.launcher.cwd : process.cwd()
    const script = 'sleep 2; i=0; while [ "$i" -lt 5 ]; do ' + quoted + ' & child=$!; sleep 6; if kill -0 "$child" 2>/dev/null; then exit 0; fi; i=$((i+1)); sleep 2; done; exit 1'
    let child
    try {
      child = spawn('sh', ['-c', script], { cwd, detached: true, stdio: 'inherit' })
    } catch (error) {
      return { ok: false, error: '无法拉起替代进程：' + (error instanceof Error ? error.message : String(error)) }
    }
    child.on('error', () => {})
    child.unref()
    setTimeout(() => process.exit(0), 1000)
    return { ok: true, message: 'DSH 正在重启，页面将自动等待服务恢复并刷新' }
  })

  route('/plug-mgr/pending', async (params) => {
    const cancel = params.get('cancel')
    if (typeof cancel === 'string' && cancel !== '') {
      const existed = pending.delete(cancel)
      return { ok: existed, items: listPending() }
    }
    return { ok: true, items: listPending() }
  })

  route('/plug-mgr/proxy', async (params) => {
    const set = params.get('set')
    if (typeof set === 'string') {
      const value = set.trim()
      let toSave
      if (value === 'direct') toSave = ''
      else {
        if (value === '') return { ok: false, error: '请提供代理地址，或使用 direct 强制直连' }
        if (value.length > 300) return { ok: false, error: '代理地址过长（最多 300 字符）' }
        if (!PROXY_SCHEME_RE.test(value)) {
          return { ok: false, error: '不支持的代理格式：' + value + '（应为 http://、https://、socks5://、socks5h:// 或 socks4:// 开头）' }
        }
        toSave = value
      }
      try {
        await saveProxySetting(toSave)
        persistedProxy = toSave
      } catch (error) {
        return { ok: false, error: '保存代理设置失败：' + (error instanceof Error ? error.message : String(error)) }
      }
    } else if (params.get('clear') !== null) {
      try {
        await saveProxySetting(undefined)
        persistedProxy = undefined
      } catch (error) {
        return { ok: false, error: '清除代理设置失败：' + (error instanceof Error ? error.message : String(error)) }
      }
    }
    const current = resolveProxy()
    return { ok: true, proxy: current.proxy, source: current.source, curl: probeCurl() }
  })

  route('/plug-mgr/proxy-test', async () => {
    const current = resolveProxy()
    const startedAt = Date.now()
    try {
      const { status, body } = await httpGet(GH_API + '/zen')
      return {
        ok: status === 200,
        status,
        latencyMs: Date.now() - startedAt,
        proxy: current.proxy,
        source: current.source,
        text: clip(body, 100),
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - startedAt,
        proxy: current.proxy,
        source: current.source,
      }
    }
  })

  // ---------------------------------- 提示词上下文中的待处理请求
  if (systemPrompt !== undefined) {
    systemPrompt.context({
      name: 'plug-manager:pending',
      order: 130,
      text: () => {
        if (pending.size === 0) return ''
        const lines = []
        for (const entry of pending.values()) {
          lines.push('- ' + entry.phrase + '（请求 ' + entry.id + '）— 调用对应的 plug_install/plug_remove/plug_update 工具来完成它')
        }
        return '插件管理器待处理请求（来自 设置 → 插件 → 插件市场）：\n' + lines.join('\n')
      },
    })
  }
}
