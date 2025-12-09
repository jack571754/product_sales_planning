const path = require('path');

module.exports = {
  presets: [
    // 技巧：使用绝对路径直接读取文件，绕过 package.json 的 exports 限制
    require(path.join(__dirname, 'node_modules/frappe-ui/src/utils/tailwind.config'))
  ],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}