const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};

document.querySelector("#start").addEventListener("click", async () => {
  const tab = await getCurrentTab();
  chrome.tabs.sendMessage(tab.id, { status: true });
});

document.querySelector("#export").addEventListener("click", () => {
  exportExcel();
});

/**
 * @description 导出表格
 */
async function exportExcel() {
  const data = await chrome.storage.local.get(["SHOPS"]);
  if (!data || data.SHOPS.length === 0) {
    alert("没有数据可导出");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data.SHOPS);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  XLSX.writeFile(workbook, "大众点评店铺信息表.xlsx");

  chrome.storage.local.set({
    SHOPS: [],
  });
}
