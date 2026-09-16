const socket = io();

const username = prompt("Enter your username:");

const send = document.querySelector(".send-btn");
const input = document.getElementById("msg-input");

const chatList = document.querySelector(".chat-list");
const chatFeed = document.querySelector(".chat-feed");

const chatHeaderName = document.getElementById("chat-header-name");

const chatHeaderStatus = document.getElementById("chat-header-status");

const chatHeaderAvatar = document.getElementById("chat-header-avatar");


let selectedUserId = null;
let selectedUserName = null;

socket.emit("join", username);

socket.on("users", (users) => {
    chatList.innerHTML = "";
    users.forEach((user, index) => {
        if (user.id === socket.id) return;
        const item = document.createElement("div");
        item.classList.add("chat-item");
        item.dataset.userId = user.id;
        item.dataset.username = user.username;
        item.innerHTML = `
            <div class="avatar-wrap">
                <div class="avatar grad-${(index % 5) + 1}">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <span class="online-badge"></span>
            </div>

            <div class="chat-details">
                <div class="chat-top-row">
                    <span class="chat-name">
                        ${escapeHTML(user.username)}
                    </span>
                </div>

                <div class="chat-bottom-row">
                    <span class="chat-preview">
                        Online
                    </span>
                </div>

            </div>
        `;
        chatList.appendChild(item);
    });
});

chatList.addEventListener("click", (e) => {
    const chatItem = e.target.closest(".chat-item");
    if (!chatItem) return;

    document.querySelectorAll(".chat-item").forEach(item => {
            item.classList.remove("active");
    });

    chatItem.classList.add("active");
    selectedUserId = chatItem.dataset.userId;

    selectedUserName = chatItem.dataset.username;

    chatHeaderName.textContent = selectedUserName;

    chatHeaderStatus.textContent = "online";

    chatHeaderStatus.classList.remove("offline");

    chatHeaderAvatar.textContent = selectedUserName.charAt(0).toUpperCase();
    
    socket.emit(
        "load-messages",
        selectedUserId
    );
});


socket.on("chat-history", (messages) => {
    if (!selectedUserId) return;
    chatFeed.innerHTML = "";
    if (messages.length === 0) {
        showEmptyMessage();
        return;
    }
    messages.forEach(message => {
        const isOutgoing = message.senderId === socket.id;
        displayMessage(
            message,
            isOutgoing
        );
    });
    scrollToBottom();
});

send.addEventListener(
    "click",
    sendMessage
);

input.addEventListener("keydown",(e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    }
);

function sendMessage() {
    const message = input.value.trim();
    if (!message) return;
    if (!selectedUserId) {
        alert("Select a chat first");
        return;
    }

    socket.emit("private-message",{
        receiverId: selectedUserId,
        message:message
        }
    );
    input.value = "";
    input.focus();
}

socket.on("private-message",(message) => {

        const belongsToCurrentChat = message.senderId === selectedUserId || message.receiverId === selectedUserId;
        if (!belongsToCurrentChat) {
            return;
        }

        const isOutgoing =
            message.senderId === socket.id;

        displayMessage(
            message,
            isOutgoing
        );
    }
);

function displayMessage(
    data,
    isOutgoing
) {

    removeEmptyMessage();

    const row = document.createElement("div");
    row.classList.add("msg-row");
    if (isOutgoing) {
        row.classList.add("outgoing");
    } else {
        row.classList.add("incoming");
    }

    const time =
        new Date(data.createdAt || Date.now()).toLocaleTimeString([],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    row.innerHTML = `
        ${!isOutgoing
            ? `
            <div class="avatar-wrap">
                <div class="msg-avatar"
                     style="
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:#5288c1;
                        color:white;
                        font-weight:600;
                     ">

                    ${escapeHTML(
                data.senderName
                    .charAt(0)
                    .toUpperCase()
            )}

                </div>

            </div>
            `
            : ""
        }

        <div class="bubble">
            ${!isOutgoing
            ? `
                <div class="bubble-sender">
                    ${escapeHTML(
                data.senderName
            )}
                </div>
                `
            : ""
        }
            <span class="bubble-text">
                ${escapeHTML(
            data.message
        )}
            </span>
            <div class="bubble-meta">
                <span>
                    ${time}
                </span>
                ${isOutgoing
            ? `
                    <span class="ticks">
                        ✓✓
                    </span>
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
                Send a message to start
                the conversation
            </span>

        </div>
    `;
}

function removeEmptyMessage() {
    const empty =
        chatFeed.querySelector(
            ".empty-chat-notice"
        );
    if (empty) {
        empty.remove();
    }
}

function scrollToBottom() {
    chatFeed.scrollTop =
        chatFeed.scrollHeight;

}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}