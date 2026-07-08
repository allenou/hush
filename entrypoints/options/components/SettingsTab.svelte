<script lang="ts">
  let {
    blockAds = false,
    blockSubdomains = true,
    recordSearchHistory = true,
    onToggleAdBlock,
    onToggleSubdomain,
    onToggleRecordSearch,
  }: {
    blockAds?: boolean;
    blockSubdomains?: boolean;
    recordSearchHistory?: boolean;
    onToggleAdBlock?: () => void;
    onToggleSubdomain?: () => void;
    onToggleRecordSearch?: () => void;
  } = $props();

  function handleToggleAdBlock() {
    onToggleAdBlock?.();
  }

  function handleToggleSubdomain() {
    onToggleSubdomain?.();
  }

  function handleToggleRecordSearch() {
    onToggleRecordSearch?.();
  }
</script>

<div class="method-card">
  <div class="method-heading">
    <h2 class="card-title">匹配方式</h2>
    <p class="card-desc">控制规则匹配行为，按需开启或关闭</p>
  </div>
  <div class="toggle-list">
    <div class="toggle-item">
      <div class="toggle-copy">
        <strong>广告标记</strong>
        <p>自动识别搜索结果中的广告并标记</p>
      </div>
      <label class="toggle" aria-label="切换广告标记">
        <input type="checkbox" checked={blockAds} onchange={handleToggleAdBlock} />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
    </div>
    <div class="toggle-item">
      <div class="toggle-copy">
        <strong>子域名匹配</strong>
        <p>主域名规则自动覆盖子域名</p>
      </div>
      <label class="toggle" aria-label="切换子域名匹配">
        <input type="checkbox" checked={blockSubdomains} onchange={handleToggleSubdomain} />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
    </div>
  </div>
</div>

<div class="method-card">
  <div class="method-heading">
    <h2 class="card-title">搜索记录</h2>
    <p class="card-desc">记录搜索关键词和使用的搜索引擎</p>
  </div>
  <div class="toggle-list">
    <div class="toggle-item">
      <div class="toggle-copy">
        <strong>记录搜索历史</strong>
        <p>关闭后不再记录新的搜索关键词</p>
      </div>
      <label class="toggle" aria-label="切换搜索记录">
        <input type="checkbox" checked={recordSearchHistory} onchange={handleToggleRecordSearch} />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
    </div>
  </div>
</div>

<style>
  .method-card {
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;
    border: 1px solid #dde6e1;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(24,33,29,0.04);
  }
  .method-card + .method-card {
    margin-top: 16px;
  }
  .method-heading {
    margin-bottom: 16px;
  }

  .card-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .card-desc {
    margin: 4px 0 0;
    color: #6d7f77;
    font-size: 13px;
    line-height: 1.45;
  }

  .toggle-list {
    border-top: 1px solid #ecf1ee;
  }
  .toggle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid #ecf1ee;
  }
  .toggle-item:last-child {
    border-bottom: none;
  }
  .toggle-copy strong {
    display: block;
    font-size: 15px;
    margin-bottom: 2px;
  }
  .toggle-copy p {
    margin: 0;
    color: #6d7f77;
    font-size: 13px;
    line-height: 1.45;
  }
  .toggle {
    display: flex;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;
  }
  .toggle input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .toggle-track {
    position: relative;
    width: 44px;
    height: 26px;
    border-radius: 999px;
    background: #cfd8d3;
    transition: background 0.2s;
  }
  .toggle input:checked + .toggle-track {
    background: #0d8f66;
  }
  .toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    transition: transform 0.2s;
  }
  .toggle input:checked + .toggle-track .toggle-thumb {
    transform: translateX(18px);
  }
</style>
