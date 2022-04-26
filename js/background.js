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
  }

  sendResponse("我是 background，我已收到你的消息：" + JSON.stringify(message));
});
