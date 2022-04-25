 // 一个简单的sheet
 let sheetData = [
  { department: "行政部", count: 2 },
  { department: "技术部", count: 2 },
];
let sheet = XLSX.utils.json_to_sheet(sheetData);
console.log(sheet)
// 前往设置页面
document.querySelector("#go-to-options").addEventListener("click", () => {
  // window.open(chrome.runtime.getURL("./views/options.html"));
  makeExcel();
});

// 监听来自 content-script 的消息
let shops = [];
// chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
//   console.log("收到来自 content-script 的消息：");
//   // shops.push(message.shops);
//   console.log(shops.length, shops);
//   console.log(message, sender, sendResponse);
//   sendResponse("我是后台，我已收到你的消息：" + JSON.stringify(message));
// });

// 监听来自 content-script 的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("收到来自 content-script 的消息：");

  shops.push(...request.shops);
  console.log(shops.length, shops);
  // console.log(request, sender, sendResponse);
  sendResponse("我是后台，我已收到你的消息：" + JSON.stringify(request));
});

function makeExcel() {
  // const workbook = new ExcelJS.Workbook();
  // const worksheet = workbook.addWorksheet("大众点评商家数据");
}
// function downloadExcel(name: string, columns: ProColumns[], rows?: any[]) {
//   const excelColumns = columns
//     .filter((item) => !item.hideInSearch)
//     .map((item) => {
//       return {
//         header: item.title,
//         key: item.dataIndex,
//       };
//     });
//   const workbook = new Excel.Workbook();
//   const worksheet = workbook.addWorksheet(name);

//   worksheet.columns = excelColumns;
//   if (rows && rows.length > 0) {
//     worksheet.addRows(rows);
//   }

//   const buffer = await workbook.xlsx.writeBuffer();
//   const blob = new Blob([buffer], {
//     type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//   });
//   FileSaver.saveAs(blob, `${name}.xlsx`);
// }
