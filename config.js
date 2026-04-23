import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取配置文件
const rawConfig = readFileSync(join(__dirname, 'server_config.json'), 'utf-8');
const config = JSON.parse(rawConfig);

// 转换相对路径为绝对路径
if (!isAbsolute(config.root)) {
  config.root = join(__dirname, config.root);
}

export default config;