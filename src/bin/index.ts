import { runCliWithDebug } from '@serpent/common-cli/run'
import cli from './cli.js'

// 添加 DURKA_NODE_DEBUG 环境变量可以启动调试模式
runCliWithDebug(cli, import.meta.url)
