// 隐藏域名
async function changeBackgroundColor() {
  const result = await chrome.storage.local.get("urls");
  function getDomain(url) {
    var reg = /(http|https):\/\/(www.)?(\w+(\.)?)+/;
    var results = url.match(reg);
    return results[0];
  }

  // document.body.style.backgroundColor = "lightblue";
  let results = document.querySelectorAll("#search .g");
  for (let i = 0; i < results.length; i++) {
    const citeHTML = results[i].querySelector("cite").innerHTML;
    const domain = getDomain(citeHTML);
   
    if (result.urls.includes(domain)) {
      console.log("include");
      results[i].style.display="none";
    }
  }
}
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  console.log("hfhhh");
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: changeBackgroundColor,
  });
});

// 创建菜单
chrome.runtime.onInstalled.addListener(() => {
  // 创建一个右键菜单
  chrome.contextMenus.create(
    {
      // item的类型
      type: "normal",
      // 显示的文字，%s占位符会显示你选中的字
      title: "标记为垃圾网站 %s",
      // 这个菜单的idj
      id: "MDN-search",
      // 可以出现这个菜单项的上下文
      contexts: ["all"],
    },
    // 创建后的 回调
    function () {
      console.log("contextMenus are create.");
    }
  );
});

// 收集域名
function getDomain(url) {
  var reg = /(http|https):\/\/(www.)?(\w+(\.)?)+/;
  var results = url.match(reg);
  return results[0];
}
// 右键菜单点击的时候触发
chrome.contextMenus.onClicked.addListener((info) => {
  chrome.tabs.query(
    { windowId: chrome.windows.WINDOW_ID_CURRENT },
    async (tabs) => {
      const activeTab = tabs.find((tab) => tab.active);

      const result = await chrome.storage.local.get("urls");

      let urls = result.urls ?? [];
      console.log(activeTab);
      const domain = getDomain(activeTab.url);
      if (!urls.find((url) => url === domain)) {
        urls = [];
        urls.push(domain);
      }

      // console.log("Value currently is " + JSON.stringify(result));

      chrome.storage.local.set({ urls }, function () {
        console.log("Value is set to: " + JSON.stringify(urls));
      });

      chrome.storage.local.get("urls", function (result) {
        console.log(result.urls);
      });
    }
  );
  // chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
  //   // tabURL = tabs[0].url;
  //   // console.log("URL from get-url.js", tabURL);
  //   console.log(tabs);
  // });
  // // 新建一个tab
  // chrome.tabs.create({
  //   url:
  //     "https://developer.mozilla.org/zh-CN/search?q=" +
  //     encodeURI(info.selectionText), // info. selectionText是选中的文字
  // });
});

// chrome.tabs.onActivated.addListener(function (activeInfo) {
//   currentTabId = activeInfo.tabId;
// });

// // Usage, based on the question's function
// function getURL() {
//   return tabIdToURL[currentTabId] || "";
// }
