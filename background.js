// 툴바 아이콘 클릭 시 현재 탭의 Guider 패널을 토글한다.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "GUIDER_TOGGLE" });
  } catch (e) {
    // 콘텐츠 스크립트가 아직 주입되지 않은 페이지(확장 설치 직후 등) 대응
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["content.css"],
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      await chrome.tabs.sendMessage(tab.id, { type: "GUIDER_TOGGLE" });
    } catch (err) {
      console.warn("[Guider] 이 페이지에는 주입할 수 없습니다:", err);
    }
  }
});
