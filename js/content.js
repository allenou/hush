(function () {
  /**
   * @description 手动点击开始采集后以后的每次注入脚本都直接执行（用于多页采集）
   */
  const status = sessionStorage.getItem("STATUS");
  if (status === "start") {
    start();
  }
  /**
   * @description 接收来自 popup 的采集开始信息
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("content 收到了 来自 popup 到消息");

    if (message.status) {
      sessionStorage.setItem("STATUS", "start");
      console.log(sessionStorage.getItem("STATUS"));
      start();
    }

    sendResponse({ status: "start" });
  });

  /**
   * @description 开始
   */
  function start() {
    getShops();
    nextPage();
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
    sendMessage({ shops });
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
    } else {
      console.log("没有更多了");
      sendMessage({ export: true });
    }
  }

  /**
   * @description 发送信息
   * @param {*} message
   */
  function sendMessage(message) {
    chrome.runtime.sendMessage(message, (response) => {
      console.log("收到来自后台的回复：" + response);
    });
  }
})();
