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

const sidebarProfileAvatar =document.getElementById("sidebar-profile-avatar");

const sidebarProfileName =document.getElementById("sidebar-profile-name");

const logoutBtn =document.getElementById("logout-btn");

const profileInput = document.getElementById("signup-profile");
const profilePreview = document.getElementById("profile-preview");
const profilePlaceholder = document.getElementById("profile-placeholder");

let selectedUserId = null;
let selectedUserName = null;

let selectedUserProfile = "";

const chatWelcome = document.getElementById("chat-welcome");
const chatScreen = document.getElementById("chat-screen");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email.endsWith("@akgec.ac.in")) {
        loginError.textContent =
            "Please use your AKGEC email (@akgec.ac.in).";
        return;
    }
    
    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            loginError.textContent = data.message;
            return;
        }

        currentUser = data.user;

        localStorage.setItem("chatapp_token", data.token);
        localStorage.setItem("chatapp_user", JSON.stringify(data.user));

        updateSidebarProfile();

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
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;

    if (password !== confirmPassword) {
        signupError.textContent = "Passwords do not match";
        return;
    }

    if (password.length < 9) {
        signupError.textContent =
            "Password must be more than 8 characters";
        return;
    }

    if (!/[A-Z]/.test(password)) {
        signupError.textContent =
            "Password must contain at least one capital letter";
        return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]\/+=;'`~]/.test(password)) {
        signupError.textContent =
            "Password must contain at least one special character";
        return;
    }

    const formData = new FormData();

    formData.append("username", username);
    formData.append("email", email);
    formData.append("password", password);

    const profilePicture = profileInput.files[0];

    if (profilePicture) {
        formData.append("profilePicture", profilePicture);
    }


    try {
        const response = await fetch("/api/signup", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            signupError.textContent = data.message;
            return;
        }

        alert("Account created successfully! Please login.");

        signupForm.reset();
        profilePreview.src = "";
        profilePreview.style.display = "none";
        profilePlaceholder.style.display = "flex";
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
    item.dataset.profile = user.profile || "";

    item.innerHTML = `
        <div class="avatar-wrap">
            <div class="avatar grad-${(index % 5) + 1}">
                ${ 
                    user.profile? `<img src="${escapeHTML(user.profile)}" alt="Profile">`: escapeHTML(user.username.charAt(0).toUpperCase())
                }
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
    selectedUserProfile = chatItem.dataset.profile || "";

    chatWelcome.classList.add("hidden");
    chatScreen.classList.remove("hidden");

    chatHeaderName.textContent = selectedUserName;

    const badge = chatItem.querySelector(".online-badge");
    const isOnline = !badge?.classList.contains("offline");

    chatHeaderStatus.textContent = isOnline ? "online" : "offline";
    chatHeaderStatus.classList.toggle("offline", !isOnline);

    if (selectedUserProfile) {
        chatHeaderAvatar.innerHTML = `
            <img src="${escapeHTML(selectedUserProfile)}" alt="Profile">
        `;
    } else {
        chatHeaderAvatar.textContent =
            selectedUserName.charAt(0).toUpperCase();
    }

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
                        <div class="msg-avatar">
                            ${
                                data.senderProfile? `<img src="${escapeHTML(data.senderProfile)}" alt="Profile">`: escapeHTML(senderName.charAt(0).toUpperCase())
                            }
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
        updateSidebarProfile();
        authScreen.classList.add("hidden");
        connectSocket(savedToken);
    } catch (error) {
        console.error("Saved login error:", error);
        localStorage.removeItem("chatapp_token");
        localStorage.removeItem("chatapp_user");
    }
}


profileInput.addEventListener("change", () => {

    const file = profileInput.files[0];

    if (!file) return;

    const imageURL = URL.createObjectURL(file);

    profilePreview.src = imageURL;
    profilePreview.style.display = "block";

    profilePlaceholder.style.display = "none";
});

function updateSidebarProfile() {

    if (!currentUser) return;

    sidebarProfileName.textContent =
        currentUser.username;

    if (currentUser.profile) {

        sidebarProfileAvatar.innerHTML = `
            <img
                src="${escapeHTML(currentUser.profile)}"
                alt="Profile"
            >
        `;

    } else {

        sidebarProfileAvatar.textContent =
            currentUser.username
                .charAt(0)
                .toUpperCase();
    }
}

logoutBtn.addEventListener("click", () => {

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    localStorage.removeItem("chatapp_token");
    localStorage.removeItem("chatapp_user");

    currentUser = null;
    selectedUserId = null;
    selectedUserName = null;
    selectedUserProfile = "";

    chatList.innerHTML = "";

    chatScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");

    sidebarProfileName.textContent = "Username";

    sidebarProfileAvatar.innerHTML = "P";
});