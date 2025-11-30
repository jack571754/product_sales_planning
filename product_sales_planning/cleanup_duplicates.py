"""
清理 Commodity Schedule 中的重复记录

问题：由于日期格式不一致，导致同一个 store_id + task_id + code + month 有多条记录
解决：保留最新的记录（按 modified 排序），删除旧记录
"""

import frappe
from collections import defaultdict


def cleanup_duplicate_records():
	"""
	清理重复的 Commodity Schedule 记录

	重复定义：相同的 store_id, task_id, code, 和月份（sub_date 的年月部分）
	保留策略：保留 modified 最新的记录，删除其他记录
	"""
	print("开始清理重复记录...")

	# 获取所有记录
	all_records = frappe.get_all(
		"Commodity Schedule",
		fields=["name", "store_id", "task_id", "code", "sub_date", "quantity", "modified"],
		order_by="modified desc"
	)

	print(f"总记录数: {len(all_records)}")

	# 按 store_id + task_id + code + month 分组
	groups = defaultdict(list)

	for record in all_records:
		# 提取年月作为分组键
		if record.sub_date:
			month_key = str(record.sub_date)[:7]  # YYYY-MM
		else:
			month_key = "null"

		# 组合键：store_id + task_id + code + month
		group_key = (
			record.store_id or "",
			record.task_id or "",
			record.code or "",
			month_key
		)

		groups[group_key].append(record)

	# 统计
	duplicate_groups = {k: v for k, v in groups.items() if len(v) > 1}
	total_duplicates = sum(len(v) - 1 for v in duplicate_groups.values())

	print(f"发现 {len(duplicate_groups)} 组重复记录")
	print(f"需要删除 {total_duplicates} 条重复记录")

	if total_duplicates == 0:
		print("没有重复记录，无需清理")
		return

	# 确认是否继续
	print("\n重复记录示例（前5组）：")
	for i, (key, records) in enumerate(list(duplicate_groups.items())[:5]):
		store_id, task_id, code, month = key
		print(f"\n组 {i+1}: 店铺={store_id}, 任务={task_id}, 产品={code}, 月份={month}")
		print(f"  共 {len(records)} 条记录:")
		for rec in records:
			print(f"    - {rec.name}: 数量={rec.quantity}, 日期={rec.sub_date}, 修改时间={rec.modified}")

	confirm = input(f"\n确认删除 {total_duplicates} 条重复记录？(yes/no): ")

	if confirm.lower() != 'yes':
		print("取消清理")
		return

	# 执行删除
	deleted_count = 0

	for group_key, records in duplicate_groups.items():
		# 保留第一条（最新的），删除其他
		keep_record = records[0]
		delete_records = records[1:]

		print(f"\n处理组: {group_key}")
		print(f"  保留: {keep_record.name} (数量={keep_record.quantity}, 修改时间={keep_record.modified})")

		for rec in delete_records:
			try:
				frappe.delete_doc("Commodity Schedule", rec.name, force=True)
				deleted_count += 1
				print(f"  删除: {rec.name} (数量={rec.quantity}, 修改时间={rec.modified})")
			except Exception as e:
				print(f"  删除失败 {rec.name}: {str(e)}")

	frappe.db.commit()

	print(f"\n清理完成！成功删除 {deleted_count} 条重复记录")


if __name__ == "__main__":
	# 在 bench console 中运行此脚本
	cleanup_duplicate_records()
