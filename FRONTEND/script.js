let socket = null;
let currentUser = null;

const authScreen = document.getElementById("auth-screen");
const signupScreen = document.getElementById("signup-screen");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const showSignup = document.getElementById("show-signup");
const showLogin = document.getElementById("show-login");
const loginError = document.getElementById("login-error");
const signupError = document.getElementById("signup-error");

const send = document.querySelector(".send-btn");
const input = document.getElementById("msg-input");
const chatList = document.querySelector(".chat-list");
const searchInput = document.querySelector(".search-input");
const chatFeed = document.querySelector(".chat-feed");
const chatHeaderName = document.getElementById("chat-header-name");
const chatHeaderStatus = document.getElementById("chat-header-status");
const chatHeaderAvatar = document.getElementById("chat-header-avatar");

let selectedUserId = null;
let selectedUserName = null;

const chatWelcome = document.getElementById("chat-welcome");
const chatScreen = document.getElementById("chat-screen");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            loginError.textContent = data.message;
            return;
        }

        currentUser = data.user;

        localStorage.setItem("chatapp_token", data.token);
        localStorage.setItem("chatapp_user", JSON.stringify(data.user));

        authScreen.classList.add("hidden");
        connectSocket(data.token);
    } catch (error) {
        console.error("Login error:", error);
        loginError.textContent = "Unable to connect to server.";
    }
});

signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    signupError.textContent = "";

    const username = document.getElementById("signup-username").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;

    if (password !== confirmPassword) {
        signupError.textContent = "Passwords do not match";
        return;
    }

    try {
        const response = await fetch("/api/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            signupError.textContent = data.message;
            return;
        }

        alert("Account created successfully! Please login.");

        signupForm.reset();
        signupScreen.classList.add("hidden");
        authScreen.classList.remove("hidden");
    } catch (error) {
        console.error("Signup error:", error);
        signupError.textContent = "Unable to connect to server.";
    }
});

showSignup.addEventListener("click", (e) => {
    e.preventDefault();
    authScreen.classList.add("hidden");
    signupScreen.classList.remove("hidden");
    loginError.textContent = "";
});

showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    signupScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
    signupError.textContent = "";
});

function showHomeScreen() {
    selectedUserId = null;

    chatWelcome.classList.remove("hidden");
    chatScreen.classList.add("hidden");
}

function connectSocket(token) {
    socket = io({auth: {token}});
    showHomeScreen();

    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        socket.emit("load-chat-list");
    });

    socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
    });

    socket.on("chat-list", (users) => {
        chatList.innerHTML = "";

        users.forEach((user, index) => {
            if (user.id === currentUser.id) return;
            addChatUser(user, index);
        });
    });

    socket.on("chat-added", (user) => {
        addChatUser(user, chatList.children.length);
    });

    socket.on("user-status", ({ userId, online }) => {
        updateUserStatus(userId, online);
    });

    socket.on("search-results", (users) => {
    chatList.innerHTML = "";

    users.forEach((user, index) => {
        if (user.id === currentUser.id) return;

        addChatUser(user, index);
    });
});

    socket.on("chat-history", (messages) => {
        if (!selectedUserId) return;

        chatFeed.innerHTML = "";

        if (messages.length === 0) {
            showEmptyMessage();
            return;
        }

        messages.forEach((message) => {
            const isOutgoing = message.senderId === currentUser.id;
            displayMessage(message, isOutgoing);
        });

        scrollToBottom();
    });

    socket.on("private-message", (message) => {
        if (message.senderId !== currentUser.id && message.senderId !== selectedUserId) {
            addChatUser({
                id: message.senderId,
                username: message.senderName,
                online: true
            }, chatList.children.length);
        }

        const belongsToCurrentChat = message.senderId === selectedUserId || message.receiverId === selectedUserId;

        if (!belongsToCurrentChat) return;

        const isOutgoing = message.senderId === currentUser.id;

        displayMessage(message, isOutgoing);
        scrollToBottom();
    });
}

function addChatUser(user, index = 0) {
    if (user.id === currentUser.id) return;

    const existingItem = chatList.querySelector(
        `.chat-item[data-user-id="${user.id}"]`
    );

    if (existingItem) {
        updateUserStatus(user.id, user.online);
        return;
    }

    const item = document.createElement("div");

    item.classList.add("chat-item");
    item.dataset.userId = user.id;
    item.dataset.username = user.username;

    item.innerHTML = `
        <div class="avatar-wrap">
            <div class="avatar grad-${(index % 5) + 1}">
                ${escapeHTML(user.username.charAt(0).toUpperCase())}
            </div>
            <span class="online-badge ${user.online ? "" : "offline"}"></span>
        </div>
        <div class="chat-details">
            <div class="chat-top-row">
                <span class="chat-name">
                    ${escapeHTML(user.username)}
                </span>
            </div>
            <div class="chat-bottom-row">
                <span class="chat-preview">
                    ${user.online ? "Online" : "Offline"}
                </span>
            </div>
        </div>
    `;

    chatList.appendChild(item);
}

searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();

    if (!query) {
        socket.emit("load-chat-list");
        return;
    }

    socket.emit("search-users", query);
});

function updateUserStatus(userId, online) {
    const chatItem = chatList.querySelector(
        `.chat-item[data-user-id="${userId}"]`
    );

    if (!chatItem) return;

    const badge = chatItem.querySelector(".online-badge");
    const preview = chatItem.querySelector(".chat-preview");

    if (online) {
        badge?.classList.remove("offline");

        if (preview) {
            preview.textContent = "Online";
        }
    } else {
        badge?.classList.add("offline");

        if (preview) {
            preview.textContent = "Offline";
        }
    }

    if (selectedUserId === userId) {
        chatHeaderStatus.textContent = online ? "online" : "offline";
        chatHeaderStatus.classList.toggle("offline", !online);
    }
}

chatList.addEventListener("click", (e) => {
    const chatItem = e.target.closest(".chat-item");

    if (!chatItem) return;

    document.querySelectorAll(".chat-item").forEach((item) => {
        item.classList.remove("active");
    });

    chatItem.classList.add("active");

    selectedUserId = chatItem.dataset.userId;
    selectedUserName = chatItem.dataset.username;

    chatWelcome.classList.add("hidden");
    chatScreen.classList.remove("hidden");

    chatHeaderName.textContent = selectedUserName;

    const badge = chatItem.querySelector(".online-badge");
    const isOnline = !badge?.classList.contains("offline");

    chatHeaderStatus.textContent = isOnline ? "online" : "offline";
    chatHeaderStatus.classList.toggle("offline", !isOnline);

    chatHeaderAvatar.textContent = selectedUserName.charAt(0).toUpperCase();
    chatFeed.innerHTML = "";
    socket.emit("load-messages", selectedUserId);
});

send.addEventListener("click", sendMessage);

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const message = input.value.trim();

    if (!message) return;

    if (!selectedUserId) {
        alert("Select a chat first");
        return;
    }

    socket.emit("private-message", {
        receiverId: selectedUserId,
        message
    });

    input.value = "";
    input.focus();
}

function displayMessage(data, isOutgoing) {
    removeEmptyMessage();

    const row = document.createElement("div");

    row.classList.add("msg-row");

    if (isOutgoing) {
        row.classList.add("outgoing");
    } else {
        row.classList.add("incoming");
    }

    const time = new Date(
        data.createdAt || Date.now()
    ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    const senderName =
        data.senderName ||
        selectedUserName ||
        "User";

    row.innerHTML = `
        ${
            !isOutgoing
                ? `
                    <div class="avatar-wrap">
                        <div
                            class="msg-avatar"
                            style="
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                background:#5288c1;
                                color:white;
                                font-weight:600;
                            "
                        >
                            ${escapeHTML(
                                senderName.charAt(0).toUpperCase()
                            )}
                        </div>
                    </div>
                `
                : ""
        }

        <div class="bubble">
            ${
                !isOutgoing
                    ? `
                        <div class="bubble-sender">
                            ${escapeHTML(senderName)}
                        </div>
                    `
                    : ""
            }

            <span class="bubble-text">
                ${escapeHTML(data.message)}
            </span>

            <div class="bubble-meta">
                <span>${time}</span>

                ${
                    isOutgoing
                        ? `
                            <span class="ticks">✓✓</span>
                        `
                        : ""
                }
            </div>
        </div>
    `;

    chatFeed.appendChild(row);
    scrollToBottom();
}

function showEmptyMessage() {
    chatFeed.innerHTML = `
        <div class="empty-chat-notice">
            <div class="empty-chat-icon">
                💬
            </div>
            <span class="empty-chat-title">
                No messages here yet...
            </span>
            <span class="empty-chat-desc">
                Send a message to start the conversation
            </span>
        </div>
    `;
}

function removeEmptyMessage() {
    const empty = chatFeed.querySelector(".empty-chat-notice");

    if (empty) {
        empty.remove();
    }
}

function scrollToBottom() {
    chatFeed.scrollTop = chatFeed.scrollHeight;
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
}

const savedToken = localStorage.getItem("chatapp_token");
const savedUser = localStorage.getItem("chatapp_user");

if (savedToken && savedUser) {
    try {
        currentUser = JSON.parse(savedUser);
        authScreen.classList.add("hidden");
        connectSocket(savedToken);
    } catch (error) {
        console.error("Saved login error:", error);
        localStorage.removeItem("chatapp_token");
        localStorage.removeItem("chatapp_user");
    }
}