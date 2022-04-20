// 获取储存对域名信息
let urls = [];
const ol = document.querySelector("#domain-list");
const fragment = document.createDocumentFragment();

const domain = {
  get: () => {
    return chrome.storage.local.get("urls");
  },
  set: (list) => {
    chrome.storage.local.set({ urls: list }, () => domain.show());
  },
  add: (url) => {
    urls.push(url);
    domain.set(urls);
  },
  remove: (index) => {
    urls.splice(index, 1);
    domain.set(urls);
  },
  show: async () => {
    const result = await domain.get();

    ol.innerHTML = "";

    if (result.urls.length === 0) return;

    result.urls.forEach((url, index) => {
      const li = document.createElement("li");
      const i = document.createElement("i");
      i.innerText = "------Remove------";
      i.dataset.index = index;
      li.innerText = url;
      li.appendChild(i);
      fragment.appendChild(li);
      ol.appendChild(fragment);
    });
  },
};

domain.show();

const submitBtn = document.querySelector("#btn");
const input = document.querySelector("#input");
submitBtn.addEventListener("click", () => {
  if (input.value) {
    domain.add(input.value);
  }
});

ol.addEventListener("click", (e) => {
  if (e.target.nodeType === 1 && e.target.nodeName === "I") {
    domain.remove(e.target.dataset.index);
  }
});
