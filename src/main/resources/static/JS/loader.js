// 全頁載入器控制物件
const Loader = {
  // 顯示載入器（0.5秒後自動隱藏）
  show: function () {
    const loader = document.getElementById("page-loader");

    // 顯示載入器
    loader.classList.add("show");

    // 鎖住背景捲動
    document.body.style.overflow = "hidden";

    // 0.5秒後自動隱藏
    setTimeout(() => {
      this.hide();
    }, 500);
  },

  // 隱藏載入器
  hide: function () {
    const loader = document.getElementById("page-loader");

    // 隱藏載入器
    loader.classList.remove("show");

    // 恢復背景捲動
    document.body.style.overflow = "";

  },
};
