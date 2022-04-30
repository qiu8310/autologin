/* eslint-disable max-len */
import { cmd, opt, env } from '@serpent/common-cli/lib/cmder'
import { COMMAND_KEY } from 'src/config'
import { autologin } from '../autologin'

export default cmd(
  {
    usage:   `${COMMAND_KEY} <someLink>`,
    version: '__BUILD_VERSION__',
    desc:    [
      'Examples:',
      '',
      `$ ${COMMAND_KEY} --args="--auto-open-devtools-for-tabs" http://github.com/`,
      `$ ${COMMAND_KEY} --args="--ash-host-window-bounds=1500x1000" http://github.com/`,
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

      json:     opt('boolean', '[View] Show json result, for example `[{ "name": "a", "value": "aaa", path: "/", ... }]`'),
      dict:     opt('boolean', '[View] Show dict result, for example `{"a": "aaa"}`'),
      cookies:  opt('string', '[View] <cookie | c> Specify cookie keys that you want to view, use "," to join multiple cookie keys'),
      domain:   opt('string', '[View] Get cookies from specified domain'),
      path:     opt('string', '[View] Get cookies from specified path'),
      httpOnly: opt('boolean', '[View] Get httpOnly cookies'),
      session:  opt('boolean', '[View] Get session cookies'),
    },
    env: {
      AUTOLOGIN_CHROMIUM_EXECUTABLE_PATH: env('string', 'Specify chromium executable path for puppeteer'),
      AUTOLOGIN_CHROMIUM_USER_DATA_DIR:   env('string', 'Path to a user data directory'),
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

    autologin(url, {
      ...ctx.options,
      httpOnly:       ctx.userDefinedOptions.httpOnly ? ctx.options.httpOnly : undefined,
      session:        ctx.userDefinedOptions.session ? ctx.options.session : undefined,
      cookies:        ctx.options.cookies ? ctx.options.cookies.split(',') : [],
      userDataDir:    ctx.options.userDataDir || ctx.env.AUTOLOGIN_CHROMIUM_USER_DATA_DIR || undefined,
      executablePath: ctx.options.executablePath || ctx.env.AUTOLOGIN_CHROMIUM_EXECUTABLE_PATH || undefined,
    })
  },
)

function load(key: string) {
  return (...args: any[]) => require(key)(...args)
}
