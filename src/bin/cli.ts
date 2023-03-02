/* eslint-disable max-len */
import path from 'path'
import fs from 'fs'
import { cmd, opt, env } from '@serpent/common-cli/cmder'
import { COMMAND } from 'src/util/constant.js'
import { autologin } from '../autologin.js'
import { cache } from 'src/util/cache.js'

export default cmd(
  {
    usage:   `${COMMAND} <someLink>`,
    version: '__BUILD_VERSION__',
    desc:    [
      'Examples:',
      `$ ${COMMAND} --args="--auto-open-devtools-for-tabs" http://github.com/`,
      `$ ${COMMAND} --args="--ash-host-window-bounds=1500x1000" http://github.com/`,
      '',
      'Plugin:',
      '(p: typeof puppeteer) => {',
      '  beforeLaunch?(launchParams: Parameters<Launch>[0]): Promise<Parameters<Launch>[0]>',
      '  afterLaunch?(browser: puppeteer.Browser): Promise<void>',
      '  beforePageEmulate?(emulateParams: Parameters<PageEmulate>[0], page: puppeteer.Page): Promise<Parameters<PageEmulate>[0]>',
      '  afterPageEmulate?(page: puppeteer.Page): Promise<void>',
      '  beforePageGoto?(gotoOptions: Parameters<PageGoto>[1], page: puppeteer.Page): Promise<Parameters<PageGoto>[1]>',
      '  afterPageGoto?(page: puppeteer.Page): Promise<void>',
      '  beforeClose?(page: puppeteer.Page, browser: puppeteer.Browser): Promise<void>',
      '}',
    ],
    // 选项
    options: {
      executablePath: opt('string', '[Browser] Path to a browser executable to use instead of the bundled Chromium. Note that Puppeteer is only guaranteed to work with the bundled Chromium, so use this setting at your own risk.'),
      devtools:       opt('boolean', '[Browser] Whether to auto-open a DevTools panel for each tab. If this is set to true, then headless will be forced to false'),
      args:           opt('array', '[Browser] Additional arguments to pass to the browser instance: https://peter.sh/experiments/chromium-command-line-switches/'),
      userDataDir:    opt('string', '[Browser] Path to a user data directory: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/user_data_dir.md'),

      device:    opt('string', '[Emulate] Devices: https://github.com/puppeteer/puppeteer/blob/main/src/common/DeviceDescriptors.ts (Use the name property)'),
      userAgent: opt('string', '[Emulate] Custom userAgent'),
      width:     opt('number', '[Emulate] Page width, default 1200'),
      height:    opt('number', '[Emulate] Page height, default 800'),
      dpr:       opt('number', '[Emulate] Device pixel ration, default 1'),

      cache:    opt('string', '[View] Cache cookies, for example cache one day: "--cache 1d"'),
      json:     opt('boolean', '[View] Show json result, for example `[{ "name": "a", "value": "aaa", path: "/", ... }]`'),
      dict:     opt('boolean', '[View] Show dict result, for example `{"a": "aaa"}`'),
      cookies:  opt('string', '[View] <cookie | c> Specify cookie keys that you want to view, use "," to join multiple cookie keys'),
      domain:   opt('string', '[View] Get cookies from specified domain'),
      path:     opt('string', '[View] Get cookies from specified path'),
      httpOnly: opt('boolean', '[View] Get httpOnly cookies'),
      session:  opt('boolean', '[View] Get session cookies'),

      hideCloseButton: opt('boolean', '[Others] Do not show close button on browser'),
      plugin:          opt('string', '[Others] Plugin file'),
    },
    env: {
      AUTOLOGIN_CHROMIUM_EXECUTABLE_PATH: env('string', 'Same with `executablePath` option, used in environment'),
      AUTOLOGIN_CHROMIUM_USER_DATA_DIR:   env('string', 'Same with `userDataDir` option, used in environment'),
    },
    // 子命令
    commands: {
      '<ls>         Show all supported emulate devices': load('./cli-ls-device'),
    },
  },
  ctx => {
    process.on('unhandledRejection', (e: any) => {
      // 大部分错误都是： Error: Navigation failed because browser has disconnected!
      // 如果是这种错误则忽略
      // FIXME: puppeteer 中是否有优雅的结束 browser 的方法
      if (e && typeof e.message === 'string' && e.message.includes('Navigation failed')) {
        return
      } else {
        console.log(e)
      }
    })

    const url = ctx.args[0]
    if (!url) return ctx.help()

    const { cache: timeString, ...opts } = ctx.options
    const run = () => autologin(url, {
      ...opts,
      httpOnly:       ctx.userDefinedOptions.httpOnly ? opts.httpOnly : undefined,
      session:        ctx.userDefinedOptions.session ? opts.session : undefined,
      cookies:        opts.cookies ? opts.cookies.split(',') : [],
      userDataDir:    opts.userDataDir || ctx.env.AUTOLOGIN_CHROMIUM_USER_DATA_DIR || undefined,
      executablePath: opts.executablePath || ctx.env.AUTOLOGIN_CHROMIUM_EXECUTABLE_PATH || undefined,
      plugin:         opts.plugin ? loadPlugin(opts.plugin) : undefined,
    })

    return (timeString ? cache(url, run, timeString) : run()).then(result => {
      console.log(result) // 输出结果
    })
  },
)

function load(key: string) {
  return (...args: any[]) => require(key)(...args)
}
function loadPlugin(pluginFile: string) {
  const file = path.resolve(pluginFile)
  if (fs.existsSync(file)) return require(file)
  return require(pluginFile)
}
