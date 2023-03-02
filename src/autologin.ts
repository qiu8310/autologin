/* eslint-disable max-len */
import puppeteer from 'puppeteer'

type Launch = typeof puppeteer['launch']
type PageEmulate = puppeteer.Page['emulate']
type PageGoto = puppeteer.Page['goto']
interface PluginFnReturn {
  beforeLaunch?(launchParams: Parameters<Launch>[0]): Promise<Parameters<Launch>[0]>
  afterLaunch?(browser: puppeteer.Browser): Promise<void>

  beforePageEmulate?(emulateParams: Parameters<PageEmulate>[0], page: puppeteer.Page): Promise<Parameters<PageEmulate>[0]>
  afterPageEmulate?(page: puppeteer.Page): Promise<void>

  beforePageGoto?(gotoOptions: Parameters<PageGoto>[1], page: puppeteer.Page): Promise<Parameters<PageGoto>[1]>
  afterPageGoto?(page: puppeteer.Page): Promise<void>

  beforeClose?(page: puppeteer.Page, browser: puppeteer.Browser): Promise<void>
}
type PluginFn = (p: typeof puppeteer) => PluginFnReturn

export interface AutologinOptions {
  /** Path to a browser executable to use instead of the bundled Chromium. Note that Puppeteer is only guaranteed to work with the bundled Chromium, so use this setting at your own risk. */
  executablePath?: string
  /** Whether to auto-open a DevTools panel for each tab. If this is set to true, then headless will be forced to false. */
  devtools?: boolean
  /** Additional arguments to pass to the browser instance */
  args?: string[]
  /** Path to a user data directory */
  userDataDir?: string;

  /** 显示 json 版格式的 cookies，会展示 cookie 中的各类信息，如域名，是否是 httpOnly 等等 */
  json?: boolean
  /** 显示 python dict 格式的 cookies */
  dict?: boolean
  /** 指定要显示的 cookie 的键值 */
  cookies?: string[]

  /** 获取指定域名的 cookie */
  domain?: string
  /** 获取指定路径的 cookie */
  path?: string
  /** 获取 httpOnly 的 cookie */
  httpOnly?: boolean
  /** 获取 session 的 cookie */
  session?: boolean

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

  /** 是否隐藏关闭按钮，如果不显示，需要自己去调用 window.__finishAutologin() 函数来关闭 */
  hideCloseButton?: boolean

  plugin?: PluginFn
}

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36'

export async function autologin(url: string, options: AutologinOptions = {}) {
  /* eslint-disable no-async-promise-executor */
  return new Promise<any>(async(resolve) => {
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

    const hook = getPluginHook(options.plugin)

    const launchParams = await hook('beforeLaunch', [{
      userDataDir:     options.userDataDir,
      executablePath:  options.executablePath,
      devtools:        options.devtools,
      args:            options.args,
      defaultViewport: device.viewport,
      headless:        false,
    }])
    const browser = await puppeteer.launch(launchParams)
    await hook('afterLaunch', [browser])

    const page = (await browser.pages())[0] || browser.newPage()
    // 暴露一个方法到页面中
    await page.exposeFunction('__finishAutologin', closeBrowser)

    // 每次页面加载完成都注入一个关闭按钮
    if (!options.hideCloseButton) {
      page.on('domcontentloaded', () => page.evaluate(injectCloseButton))
    }

    const emulateParams = await hook('beforePageEmulate', [ device, page ])
    await page.emulate(emulateParams)
    await hook('afterPageEmulate', [page])

    const gotoParams = await hook('beforePageGoto', [ undefined, page ])
    await page.goto(url, gotoParams)
    await hook('afterPageGoto', [page])

    async function closeBrowser() {
      const client = await page.target().createCDPSession()

      let { cookies } = await client.send('Network.getAllCookies')

      cookies = cookies.filter(c => {
        if (options.cookies?.length && !options.cookies?.includes(c.name)) return false
        if (options.domain != null && c.domain !== options.domain) return false
        if (options.httpOnly != null && c.httpOnly !== options.httpOnly) return false
        if (options.session != null && c.session !== options.session) return false
        if (options.path != null && c.path !== options.path) return false
        return true
      })

      let result: any
      if (options.dict) {
        const s = (str: string) => JSON.stringify(str)
        result = `{${cookies.map(c => `${s(c.name)}: ${s(c.value)}`).join(', ')}}`
      } else if (options.json) {
        result = cookies
      } else {
        result = cookies.map(c => `${c.name}=${c.value}`).join('; ')
      }

      await hook('beforeClose', [ page, browser ])
      await page.close()
      await browser.close()
      resolve(result)
    }
  })
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

function getPluginHook(pluginFn?: PluginFn) {
  const fn = pluginFn && (pluginFn as any).default ? (pluginFn as any).default : pluginFn
  const plugin: ReturnType<PluginFn> = fn ? fn(puppeteer) : {}

  return <T extends keyof PluginFnReturn>(hook: T, args: Parameters<Required<PluginFnReturn>[T]>) => {
    const fn = plugin[hook]
    if (typeof fn === 'function') {
      return (fn as any)(...args) as ReturnType<Required<PluginFnReturn>[T]>
    }
    return args[0] as ReturnType<Required<PluginFnReturn>[T]>
  }
}
