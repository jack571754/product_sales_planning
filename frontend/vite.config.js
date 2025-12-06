import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { getProxyOptions } from 'frappe-ui/src/utils/vite-dev-server'
import { webserver_port } from '../../../sites/common_site_config.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/assets/product_sales_planning/planning/',  // 设置基础路径（推荐使用完整路径）
  server: {
    port: 8080,
    proxy: getProxyOptions({ port: webserver_port }),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: `../product_sales_planning/public/planning`,  // 输出到 /planning 目录
    emptyOutDir: true,
    target: 'es2015',
    rollupOptions: {
      output: {
        // 固定文件名，去除哈希值
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  optimizeDeps: {
    include: ['frappe-ui > feather-icons', 'showdown', 'engine.io-client'],
  },
})
