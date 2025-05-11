document.addEventListener('DOMContentLoaded', function() {
  console.log("TabWise popup loaded.");

  const dashboardLink = document.getElementById('openDashboard');
  if (dashboardLink) {
    dashboardLink.addEventListener('click', function(event) {
      event.preventDefault();
      // dashboard.html should be the output of `next export` for the dashboard page,
      // placed at the root of the extension package.
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
      window.close(); // Close the popup after opening the dashboard
    });
  }
});
