/**
 * Product Sales Planning - Global JavaScript
 *
 * 这个文件会在所有 Frappe Desk 页面加载时执行
 * 用于定义全局的 JavaScript 函数、工具类和配置
 */

// 全局命名空间
frappe.provide('product_sales_planning');

// 全局配置
product_sales_planning.config = {
    app_name: 'Product Sales Planning',
    version: '1.0.0'
};

// 全局工具函数
product_sales_planning.utils = {
    /**
     * 格式化数字
     */
    formatNumber: function(num, decimals = 2) {
        if (num === null || num === undefined || num === '') return '';
        return parseFloat(num).toFixed(decimals);
    },

    /**
     * 显示成功消息
     */
    showSuccess: function(message) {
        frappe.show_alert({
            message: message,
            indicator: 'green'
        }, 3);
    },

    /**
     * 显示错误消息
     */
    showError: function(message) {
        frappe.show_alert({
            message: message,
            indicator: 'red'
        }, 5);
    },

    /**
     * 显示警告消息
     */
    showWarning: function(message) {
        frappe.show_alert({
            message: message,
            indicator: 'orange'
        }, 4);
    }
};

console.log('Product Sales Planning app loaded successfully');
