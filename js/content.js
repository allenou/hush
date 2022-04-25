/**
 * @description 开始
 */
function start() {
  getShops();
  // nextPage();
}
/**
 * @description 获取店铺信息
 */
function getShops() {
  const cityNode = document.querySelector(".J-current-city");
  let shops = [];
  const shopNodeList = document.querySelectorAll("#shop-all-list li");
  shopNodeList.forEach((item, index) => {
    shops.push({
      index,
      city: cityNode ? cityNode.innerText : "",
      shop: item.querySelector("h4").innerText,
    });
  });
  sendMessage(shops);
}
/**
 * @description 下一页
 */
function nextPage() {
  const nextPageBtn = document.querySelector(".page .next");
  if (nextPageBtn) {
    setTimeout(() => {
      nextPageBtn.click();
    }, 3000);
  }
}

function onMessage() {}
/**
 * @description
 */
chrome.runtime.onMessage.addListener(function (message) {
  console.log(message);
});

function sendMessage(shops) {
  chrome.runtime.sendMessage({ shops }, function (response) {
    console.log("收到来自后台的回复：" + response);
  });
}

window.onload = start();
// window.onload = function () {
//   // chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   //   console.log("content");
//   //   // 可写成switch形式 监听所有
//   //   if (sender === "") {
//   //     // do something
//   //   }
//   //   if (request.from === "cc") {
//   //     // from 不是固定词，可使用其他自定义词汇
//   //     // do something
//   //   }
//   //   // 发送回传
//   //   sendResponse({ number: request.number });
//   //   // // 修改dom
//   //   // document.querySelector("#s-usersetting-top").innerText = request.number;
//   //   // 重发信息
//   //   chrome.runtime.sendMessage({ number: request.number + 1 }, (response) => {
//   //     console.log(
//   //       `content script -> background infos have been received. number: ${response.number}`
//   //     );
//   //   });
//   // });
// };

// if (!isExecuted) {
// }
// isExecuted = true;
