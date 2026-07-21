document.getElementById("2048-button").addEventListener("click", () => {
    chrome.storage.local.set({
        active_window: "2048"
    });
    window.location.href = "../2048/2048.html";
});

document.getElementById("snake-button").addEventListener("click", () => {
    chrome.storage.local.set({
        active_window: "snake"
    });
    window.location.href = "../snake/snake.html";
});

// Redirects to the window that was open last
chrome.storage.local.get(
    ["active_window"],
    (result) => {

        if (result.active_window == "2048") {
            window.location.href = "../2048/2048.html";
        } else if (result.active_window == "snake") {
            window.location.href = "../snake/snake.html";
        }

    }
);