import frappe

@frappe.whitelist()
def test_hello(name="Frappe"):
    return {"message": f"Hello {name}！来自 Vue + Element Plus 的问候！"}