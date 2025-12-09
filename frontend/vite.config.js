import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import Icons from 'unplugin-icons/vite'
import { webserver_port } from '../../../sites/common_site_config.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Icons({
      compiler: 'vue3',
      autoInstall: true
    })
  ],
  // 基础路径，指向静态资源目录
  base: '/assets/product_sales_planning/planning/',
  server: {
    port: 8080,
    // 手动配置代理
    proxy: {
      '^/(app|api|assets|files|private)': {
        target: `http://127.0.0.1:${webserver_port || 8000}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: '../product_sales_planning/public/planning', // 输出目录
    emptyOutDir: true,
    manifest: true, // 生成 manifest.json
    target: 'es2015',
    commonjsOptions: {
      include: [/frappe-ui/, /node_modules/], // 确保处理 CommonJS 依赖
    },
    // Rollup 配置
    rollupOptions: {
      output: {
        // 使用固定文件名，便于 HTML 引用
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  optimizeDeps: {
    include: [
      'frappe-ui > feather-icons', 
      'showdown', 
      'engine.io-client',
      'frappe-ui' // 显式添加 frappe-ui 优化
    ],
  },
})