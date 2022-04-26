/**
 * @description 接收来自 content-script 的消息
 */
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.shops) {
    const data = await chrome.storage.local.get(["SHOPS"]);
    let shops = [];
    if (data && data?.SHOPS) {
      shops = [...data.SHOPS, ...message.shops];
    }
    chrome.storage.local.set({
      SHOPS: shops,
    });
    console.log(await chrome.storage.local.get(["SHOPS"]));
    sendResponse(
      "我是 background，我已收到你的消息：" + JSON.stringify(message)
    );
  }
  if(message.export){
    exportExcel();
  }
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
