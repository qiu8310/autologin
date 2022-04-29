/* eslint-disable max-len */
import puppeteer from 'puppeteer'

export interface AutologinOptions {
  /** Path to a browser executable to use instead of the bundled Chromium. Note that Puppeteer is only guaranteed to work with the bundled Chromium, so use this setting at your own risk. */
  executablePath?: string
  /** Whether to auto-open a DevTools panel for each tab. If this is set to true, then headless will be forced to false. */
  devtools?: boolean

  /** 指定要模拟的设备名称，设备名称参考这里： https://github.com/puppeteer/puppeteer/blob/main/src/common/DeviceDescriptors.ts */
  device?: string
  /** 要模拟的 userAgent */
  userAgent?: string
  /** 要模拟的设备宽度，默认 1200 */
  width?: number
  /** 要模拟的设备高度，默认 800 */
  height?: number
  /** 要模拟的设备的 [dpr](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)，默认为 1 */
  dpr?: number
}

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36'

export async function autologin(url: string, options: AutologinOptions = {}) {
  const presetDevice = options.device ? puppeteer.devices[options.device] : undefined
  const device = {
    userAgent: DEFAULT_USER_AGENT,
    ...presetDevice,
    viewport:  {
      width:             1200,
      height:            800,
      deviceScaleFactor: 1,
      ...presetDevice?.viewport,
    },
  }
  if (options.userAgent) device.userAgent = options.userAgent
  if (options.width) device.viewport.width = options.width
  if (options.height) device.viewport.height = options.height
  if (options.dpr) device.viewport.deviceScaleFactor = options.dpr

  const browser = await puppeteer.launch({
    executablePath:  options.executablePath,
    devtools:        options.devtools,
    defaultViewport: device.viewport,
    headless:        false,
  })

  const page = (await browser.pages())[0] || browser.newPage()
  page.emulate(device)

  page.goto(url)


  const closeBrowser = async() => {
    const cookie = await page.evaluate(() => {
      return document.cookie
    })

    console.log(cookie)

    return browser.close()
  }

  // 暴露一个方法到页面中
  page.exposeFunction('__finishAutologin', closeBrowser)

  // 每次页面加载完成都注入一个关闭按钮
  page.on('domcontentloaded', () => page.evaluate(injectCloseButton))
}

function injectCloseButton() {
  const id = '__autologinCloseButton'
  if (document.querySelector(`#${id}`)) return
  const btn = document.createElement('div')
  btn.textContent = 'Close'
  btn.id = id
  btn.style.cssText = `
    cursor: pointer;
    position: fixed;
    z-index: 10000000;
    left: 20px;
    top: 100px;
    width: 80px;
    height: 80px;
    line-height: 80px;
    font-size: 24px;
    text-align: center;
    background: rgba(250, 0, 0, .7);
    color: white;
    border-radius: 50%;
  `
  document.body.appendChild(btn)
  btn.addEventListener('click', (window as any).__finishAutologin)
}
