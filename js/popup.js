// 前往设置页面
document.querySelector("#go-to-options").addEventListener("click", () => {
  window.open(chrome.runtime.getURL("./views/options.html"));
});
