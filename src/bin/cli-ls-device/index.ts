import puppeteer from 'puppeteer'
import { cmd, opt } from '@serpent/common-cli/cmder'
import { logger } from '@serpent/common-cli/logger'
import { COMMAND } from 'src/util/constant.js'

export default cmd(
  {
    usage:   `${COMMAND} ls-device [search]`,
    options: {
      ua: opt('boolean', '显示 userAgent 信息'),
    },
  },
  async ctx => {
    const args = ctx.args
    Object.keys(puppeteer.devices).forEach(key => {
      const device = puppeteer.devices[key]
      const { name, viewport, userAgent } = device
      if (!args.length || args.some(arg => match(arg, name))) {
        const { width, height, deviceScaleFactor } = viewport
        logger.clog(`- %c${name} %c(${width}x${height} ${deviceScaleFactor})`, 'magenta', 'reset.gray')
        if (ctx.options.ua) {
          logger.clog(`  %c${userAgent}`, 'green.gray')
        }
      }
    })
  },
)

function match(str1: string, str2: string) {
  const s1 = str1.toLocaleLowerCase().replace(/[^\w]/, '')
  const s2 = str2.toLocaleLowerCase().replace(/[^\w]/, '')
  return s1.includes(s2) || s2.includes(s1)
}
