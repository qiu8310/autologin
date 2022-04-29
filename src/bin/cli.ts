/* eslint-disable max-len */
import { cmd, opt } from '@serpent/common-cli/lib/cmder'
import { COMMAND_KEY } from 'src/config'
import { autologin } from '../autologin'

export default cmd(
  {
    usage:   `${COMMAND_KEY} <someLink>`,
    version: '__BUILD_VERSION__',
    // 选项
    options: {
      executablePath: opt('string', '[Browser] Path to a browser executable to use instead of the bundled Chromium. Note that Puppeteer is only guaranteed to work with the bundled Chromium, so use this setting at your own risk.'),
      devtools:       opt('boolean', '[Browser] Whether to auto-open a DevTools panel for each tab. If this is set to true, then headless will be forced to false'),

      device:    opt('string', '[Emulate] Devices: https://github.com/puppeteer/puppeteer/blob/main/src/common/DeviceDescriptors.ts (Use the name property)'),
      userAgent: opt('string', '[Emulate] Custom userAgent'),
      width:     opt('number', '[Emulate] Page width, default 1200'),
      height:    opt('number', '[Emulate] Page height, default 800'),
      dpr:       opt('number', '[Emulate] Device pixel ration, default 1'),
    },
    // 子命令
    commands: {
      '<ls>         show all supported emulate devices': load('./cli-ls-device'),
    },
  },
  ctx => {
    const url = ctx.args[0]
    if (url) autologin(url, ctx.options)
    else ctx.help()
  },
)

function load(key: string) {
  return (...args: any[]) => require(key)(...args)
}
