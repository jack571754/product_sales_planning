/**
 * 通用工具函数库
 * 整合所有格式化、验证、辅助函数
 */

// ==================== 防抖/节流函数 ====================

/**
 * 防抖函数 - 延迟执行函数，在指定时间内多次调用只执行最后一次
 * @param {Function} func - 需要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 * 
 * @example
 * const debouncedSearch = debounce((value) => {
 *   console.log('搜索:', value)
 * }, 300)
 */
export function debounce(func, delay) {
	let timeoutId = null
	return function(...args) {
		if (timeoutId) {
			clearTimeout(timeoutId)
		}
		timeoutId = setTimeout(() => {
			func.apply(this, args)
		}, delay)
	}
}

/**
 * 节流函数 - 限制函数执行频率，在指定时间内只执行一次
 * @param {Function} func - 需要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 * 
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('滚动事件')
 * }, 200)
 */
export function throttle(func, limit) {
	let inThrottle
	return function(...args) {
		if (!inThrottle) {
			func.apply(this, args)
			inThrottle = true
			setTimeout(() => inThrottle = false, limit)
		}
	}
}

// ==================== 日期时间格式化 ====================

/**
 * 格式化日期时间
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @param {string} format - 格式化模板，支持：YYYY-MM-DD, HH:mm:ss 等
 * @returns {string} 格式化后的日期字符串
 * 
 * @example
 * formatDate(new Date(), 'YYYY-MM-DD') // '2025-12-12'
 * formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss') // '2025-12-12 18:30:45'
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
	if (!date) return '-'
	
	const d = new Date(date)
	if (isNaN(d.getTime())) return '-'
	
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	const hours = String(d.getHours()).padStart(2, '0')
	const minutes = String(d.getMinutes()).padStart(2, '0')
	const seconds = String(d.getSeconds()).padStart(2, '0')
	
	return format
		.replace('YYYY', year)
		.replace('MM', month)
		.replace('DD', day)
		.replace('HH', hours)
		.replace('mm', minutes)
		.replace('ss', seconds)
}

/**
 * 格式化时间（仅时分秒）
 * @param {Date|string|number} time - 时间对象、时间字符串或时间戳
 * @returns {string} 格式化后的时间字符串（HH:mm:ss）
 * 
 * @example
 * formatTime(new Date()) // '18:30:45'
 */
export function formatTime(time) {
	if (!time) return ''
	const date = new Date(time)
	if (isNaN(date.getTime())) return ''
	
	return date.toLocaleTimeString('zh-CN', { 
		hour: '2-digit', 
		minute: '2-digit', 
		second: '2-digit' 
	})
}

/**
 * 格式化相对时间（多久之前）
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @returns {string} 相对时间描述
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 60000)) // '1分钟前'
 * formatRelativeTime(new Date(Date.now() - 3600000)) // '1小时前'
 */
export function formatRelativeTime(date) {
	if (!date) return ''
	
	const d = new Date(date)
	if (isNaN(d.getTime())) return ''
	
	const now = new Date()
	const diff = now - d
	const seconds = Math.floor(diff / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)
	
	if (seconds < 60) return '刚刚'
	if (minutes < 60) return `${minutes}分钟前`
	if (hours < 24) return `${hours}小时前`
	if (days < 7) return `${days}天前`
	
	return formatDate(d, 'YYYY-MM-DD')
}

// ==================== 数字格式化 ====================

/**
 * 格式化数字（添加千分位分隔符）
 * @param {number|string} num - 数字或数字字符串
 * @param {number} decimals - 小数位数，默认0
 * @returns {string} 格式化后的数字字符串
 * 
 * @example
 * formatNumber(1234567) // '1,234,567'
 * formatNumber(1234.5678, 2) // '1,234.57'
 */
export function formatNumber(num, decimals = 0) {
	if (num === null || num === undefined || num === '' || isNaN(num)) return '-'
	
	return new Intl.NumberFormat('zh-CN', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(num)
}

/**
 * 格式化货币
 * @param {number|string} amount - 金额
 * @param {string} currency - 货币符号，默认'¥'
 * @param {number} decimals - 小数位数，默认2
 * @returns {string} 格式化后的货币字符串
 * 
 * @example
 * formatCurrency(1234.56) // '¥1,234.56'
 * formatCurrency(1234.56, '$') // '$1,234.56'
 */
export function formatCurrency(amount, currency = '¥', decimals = 2) {
	if (amount === null || amount === undefined || amount === '' || isNaN(amount)) return '-'
	
	const formatted = formatNumber(amount, decimals)
	return `${currency}${formatted}`
}

/**
 * 格式化百分比
 * @param {number|string} value - 数值（0-1 或 0-100）
 * @param {number} decimals - 小数位数，默认2
 * @param {boolean} isDecimal - 是否为小数形式（0-1），默认true
 * @returns {string} 格式化后的百分比字符串
 * 
 * @example
 * formatPercent(0.1234) // '12.34%'
 * formatPercent(12.34, 2, false) // '12.34%'
 */
export function formatPercent(value, decimals = 2, isDecimal = true) {
	if (value === null || value === undefined || value === '' || isNaN(value)) return '-'
	
	const percent = isDecimal ? value * 100 : value
	return `${formatNumber(percent, decimals)}%`
}

// ==================== 字符串处理 ====================

/**
 * 截断字符串
 * @param {string} str - 原字符串
 * @param {number} maxLength - 最大长度
 * @param {string} suffix - 后缀，默认'...'
 * @returns {string} 截断后的字符串
 * 
 * @example
 * truncate('这是一个很长的字符串', 5) // '这是一个很...'
 */
export function truncate(str, maxLength, suffix = '...') {
	if (!str) return ''
	if (str.length <= maxLength) return str
	return str.substring(0, maxLength) + suffix
}

/**
 * 首字母大写
 * @param {string} str - 原字符串
 * @returns {string} 首字母大写的字符串
 * 
 * @example
 * capitalize('hello world') // 'Hello world'
 */
export function capitalize(str) {
	if (!str) return ''
	return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * 驼峰转下划线
 * @param {string} str - 驼峰命名字符串
 * @returns {string} 下划线命名字符串
 * 
 * @example
 * camelToSnake('userName') // 'user_name'
 */
export function camelToSnake(str) {
	if (!str) return ''
	return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * 下划线转驼峰
 * @param {string} str - 下划线命名字符串
 * @returns {string} 驼峰命名字符串
 * 
 * @example
 * snakeToCamel('user_name') // 'userName'
 */
export function snakeToCamel(str) {
	if (!str) return ''
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

// ==================== 数据验证 ====================

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否为有效邮箱
 * 
 * @example
 * isValidEmail('test@example.com') // true
 * isValidEmail('invalid-email') // false
 */
export function isValidEmail(email) {
	if (!email) return false
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	return emailRegex.test(email)
}

/**
 * 验证手机号格式（中国大陆）
 * @param {string} phone - 手机号
 * @returns {boolean} 是否为有效手机号
 * 
 * @example
 * isValidPhone('13800138000') // true
 * isValidPhone('12345678901') // false
 */
export function isValidPhone(phone) {
	if (!phone) return false
	const phoneRegex = /^1[3-9]\d{9}$/
	return phoneRegex.test(phone)
}

/**
 * 验证身份证号格式（中国大陆）
 * @param {string} idCard - 身份证号
 * @returns {boolean} 是否为有效身份证号
 * 
 * @example
 * isValidIdCard('110101199001011234') // true (简化验证)
 */
export function isValidIdCard(idCard) {
	if (!idCard) return false
	const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
	return idCardRegex.test(idCard)
}

/**
 * 验证URL格式
 * @param {string} url - URL地址
 * @returns {boolean} 是否为有效URL
 * 
 * @example
 * isValidUrl('https://example.com') // true
 * isValidUrl('not-a-url') // false
 */
export function isValidUrl(url) {
	if (!url) return false
	try {
		new URL(url)
		return true
	} catch {
		return false
	}
}

// ==================== 数组/对象处理 ====================

/**
 * 深拷贝对象或数组
 * @param {any} obj - 需要拷贝的对象或数组
 * @returns {any} 深拷贝后的对象或数组
 * 
 * @example
 * const original = { a: 1, b: { c: 2 } }
 * const copied = deepClone(original)
 * copied.b.c = 3 // 不会影响 original
 */
export function deepClone(obj) {
	if (obj === null || typeof obj !== 'object') return obj
	if (obj instanceof Date) return new Date(obj.getTime())
	if (obj instanceof Array) return obj.map(item => deepClone(item))
	if (obj instanceof Object) {
		const clonedObj = {}
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				clonedObj[key] = deepClone(obj[key])
			}
		}
		return clonedObj
	}
}

/**
 * 数组去重
 * @param {Array} arr - 原数组
 * @param {string} key - 对象数组时的唯一键
 * @returns {Array} 去重后的数组
 * 
 * @example
 * unique([1, 2, 2, 3]) // [1, 2, 3]
 * unique([{id: 1}, {id: 2}, {id: 1}], 'id') // [{id: 1}, {id: 2}]
 */
export function unique(arr, key) {
	if (!Array.isArray(arr)) return []
	
	if (key) {
		const seen = new Set()
		return arr.filter(item => {
			const val = item[key]
			if (seen.has(val)) return false
			seen.add(val)
			return true
		})
	}
	
	return [...new Set(arr)]
}

/**
 * 数组分组
 * @param {Array} arr - 原数组
 * @param {string|Function} key - 分组键或分组函数
 * @returns {Object} 分组后的对象
 * 
 * @example
 * groupBy([{type: 'A', val: 1}, {type: 'B', val: 2}, {type: 'A', val: 3}], 'type')
 * // { A: [{type: 'A', val: 1}, {type: 'A', val: 3}], B: [{type: 'B', val: 2}] }
 */
export function groupBy(arr, key) {
	if (!Array.isArray(arr)) return {}
	
	return arr.reduce((result, item) => {
		const groupKey = typeof key === 'function' ? key(item) : item[key]
		if (!result[groupKey]) {
			result[groupKey] = []
		}
		result[groupKey].push(item)
		return result
	}, {})
}

// ==================== 其他工具函数 ====================

/**
 * 生成随机ID
 * @param {number} length - ID长度，默认8
 * @returns {string} 随机ID
 * 
 * @example
 * generateId() // 'a3f5d9c2'
 * generateId(16) // 'a3f5d9c2b7e1f4a6'
 */
export function generateId(length = 8) {
	return Math.random().toString(36).substring(2, 2 + length)
}

/**
 * 延迟执行
 * @param {number} ms - 延迟时间（毫秒）
 * @returns {Promise} Promise对象
 * 
 * @example
 * await sleep(1000) // 延迟1秒
 */
export function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 下载文件
 * @param {string} url - 文件URL
 * @param {string} filename - 文件名
 * 
 * @example
 * downloadFile('https://example.com/file.pdf', 'document.pdf')
 */
export function downloadFile(url, filename) {
	const link = document.createElement('a')
	link.href = url
	link.download = filename || 'download'
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 需要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 * 
 * @example
 * await copyToClipboard('Hello World')
 */
export async function copyToClipboard(text) {
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch (err) {
		console.error('复制失败:', err)
		return false
	}
}

/**
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} 文件扩展名（小写）
 * 
 * @example
 * getFileExtension('document.pdf') // 'pdf'
 * getFileExtension('image.PNG') // 'png'
 */
export function getFileExtension(filename) {
	if (!filename) return ''
	const parts = filename.split('.')
	return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数，默认2
 * @returns {string} 格式化后的文件大小
 * 
 * @example
 * formatFileSize(1024) // '1.00 KB'
 * formatFileSize(1048576) // '1.00 MB'
 */
export function formatFileSize(bytes, decimals = 2) {
	if (bytes === 0) return '0 Bytes'
	if (!bytes) return '-'
	
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	
	return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
}