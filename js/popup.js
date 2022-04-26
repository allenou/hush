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
 * @description 接收来自 content-script 的消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.shops) {
    const datas = sessionStorage.getItem("SHOPS")
      ? JSON.parse(sessionStorage.getItem("SHOPS"))
      : [];
    sessionStorage.setItem(
      "SHOPS",
      JSON.stringify([...datas, ...message.shops])
    );
    console.log(shops.length, shops);
  }

  if (message.export) {
    exportExcel();
  }
  console.log("收到来自 content-script 的消息：");

  sendResponse("我是后台，我已收到你的消息：" + JSON.stringify(message));
});
/**
 * @description 导出表格
 */
function exportExcel() {
  let datas = [];
  if (sessionStorage.getItem("SHOPS")) {
    datas = JSON.parse(sessionStorage.getItem("SHOPS"));
  }
  const worksheet = XLSX.utils.json_to_sheet(datas);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  XLSX.writeFile(workbook, "大众点评店铺信息表.xlsx");
}
