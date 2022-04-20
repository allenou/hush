// 获取储存对域名信息
let urls = [];
getDomain();
function getDomain() {
  chrome.storage.local.get("urls", (data) => {
    urls = data.urls;
    showDomainList(data.urls);
  });
}

function setDoamin(domainList) {
  chrome.storage.local.set({ urls: domainList }, () => {
    getDomain();
  });
}

// 显示域名列表
function showDomainList(urls) {
  const fragment = document.createDocumentFragment();
  const ol = document.querySelector("#domain-list");
  ol.innerHTML = "";
  urls.forEach((url, index) => {
    const li = document.createElement("li");
    const i = document.createElement("i");
    i.innerText = "Remove";
    i.dataset.index = index;
    li.innerText = url;
    li.appendChild(i);
    fragment.appendChild(li);
  });

  ol.appendChild(fragment);
}

function addDomain() {
  const domain = document.querySelector("#input");
  urls.push(domain);
  chrome.storage.local.set({ urls }, () => {
    getDomain();
  });
}
const submitBtn = document.querySelector("#btn");

submitBtn.addEventListener("click", addDomain);

// 移除域名
function removeDomain() {}

const ol = document.querySelector("ol");
ol.addEventListener("click", (e) => {
  if (e.target.nodeType === 1 && e.target.nodeName === "I") {
    urls.splice(e.target.index, 1);
    setDoamin(urls);
  }
});
