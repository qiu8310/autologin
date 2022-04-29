import { runCliWithDebug } from '@serpent/common-cli/lib/run'

// 添加 DURKA_NODE_DEBUG 环境变量可以启动调试模式
runCliWithDebug(require('./cli'), require.resolve(__filename))
