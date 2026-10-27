(() => {
  'use strict';
  if (location.hostname !== 'kylin0421.github.io' || navigator.doNotTrack === '1' || navigator.globalPrivacyControl || navigator.webdriver) return;
  function record() {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', record);
    fetch('https://linxiang-profile-chat.finecrumb18.chatgpt.site/api/visit', {
      method: 'POST', credentials: 'omit', keepalive: true, referrerPolicy: 'no-referrer'
    }).catch(() => {});
  }
  if (document.visibilityState === 'visible') record();
  else document.addEventListener('visibilitychange', record);
})();
