// content.js
function checkUrlAndBlock() {
  if (window.location.pathname.includes("/explore")) {
    // Replace the content of the page or redirect
    document.body.innerHTML = `
    <style>
        html, body {
            height: 100%;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-family: 'Arial', sans-serif;
        }
    </style>
    <div>
        <h2>This page is blocked by Ryan's Incredible Instagram Blocker</h2>
        <p>Think about how they did you wrong and focus</p>
    </div>`;
  }
}

// Run the function when the script loads
checkUrlAndBlock();

// Monitor for changes in the URL
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkUrlAndBlock();
  }
}).observe(document, { subtree: true, childList: true });
