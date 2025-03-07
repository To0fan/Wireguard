// DOM Elements
const getConfigBtn = document.querySelector('.get-btn');
const downloadBtn = document.querySelector('.download-btn');
const wireGuardConfig = document.querySelector('.wire-guard-config');
const v2rayConfig = document.querySelector('.v2ray-config');

// Event Listener for Config Button
getConfigBtn.addEventListener('click', async () => {
    getConfigBtn.style.transform = 'none';
    console.log('Button clicked!');
    try {
        showSpinner();
        const { publicKey, privateKey } = await fetchKeys();
        const installId = generateRandomString(22);
        const fcmToken = `${installId}:APA91b${generateRandomString(134)}`;
        const accountData = await fetchAccount(publicKey, installId, fcmToken);
        if (accountData) generateConfig(accountData, privateKey);
    } catch (error) {
        console.error('Error processing configuration:', error);
    } finally {
        hideSpinner();
    }
});

// Fetch Public and Private Keys
const fetchKeys = async () => {
    const response = await fetch('https://www.iranguard.workers.dev/keys');
    const data = await response.text();
    return {
        publicKey: extractKey(data, 'PublicKey'),
        privateKey: extractKey(data, 'PrivateKey'),
    };
};

// Extract Specific Key from Text Data
const extractKey = (data, keyName) =>
    data.match(new RegExp(`${keyName}:\\s(.+)`))?.[1].trim() || null;

// Fetch Account Configuration
const fetchAccount = async (publicKey, installId, fcmToken) => {
    const apiUrl = 'https://www.iranguard.workers.dev/wg';
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'User-Agent': 'okhttp/3.12.1',
            'CF-Client-Version': 'a-6.10-2158',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            key: publicKey,
            install_id: installId,
            fcm_token: fcmToken,
            tos: new Date().toISOString(),
            model: 'PC',
            serial_number: installId,
            locale: 'de_DE',
        }),
    });
    if (!response.ok) throw new Error(`Failed to fetch account: ${response.status}`);
    return response.json();
};

// Generate and Display Configurations
const generateConfig = (data, privateKey) => {
    const reserved = generateReserved(data.config.client_id);
    const wireGuardText = generateWireGuardConfig(data, privateKey);
    const v2rayText = generateV2RayURL(
        privateKey,
        data.config.peers[0].public_key,
        data.config.interface.addresses.v4,
        data.config.interface.addresses.v6,
        reserved
    );
    updateDOM(wireGuardConfig, 'WireGuard Format', 'wireguardBox', wireGuardText, 'message1');
    updateDOM(v2rayConfig, 'V2Ray Format', 'v2rayBox', v2rayText, 'message2');
    downloadBtn.style.display = 'block';
};

// Generate WireGuard Configuration Text
const generateWireGuardConfig = (data, privateKey) => `
[Interface]
PrivateKey = ${privateKey}
Address = ${data.config.interface.addresses.v4}/32, ${data.config.interface.addresses.v6}/128
DNS = 1.1.1.1, 1.0.0.1, 2606:4700:4700::1111, 2606:4700:4700::1001
MTU = 1280

[Peer]
PublicKey = ${data.config.peers[0].public_key}
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = engage.cloudflareclient.com:2408
`;

// Generate Reserved Parameter Dynamically
const generateReserved = (clientId) =>
    Array.from(atob(clientId))
        .map((char) => char.charCodeAt(0))
        .slice(0, 3)
        .join('%2C');

// Generate V2Ray URL
const generateV2RayURL = (privateKey, publicKey, ipv4, ipv6, reserved) =>
    `wireguard://${encodeURIComponent(privateKey)}@engage.cloudflareclient.com:2408?address=${encodeURIComponent(
        ipv4 + '/32'
    )},${encodeURIComponent(ipv6 + '/128')}&reserved=${reserved}&publickey=${encodeURIComponent(
        publicKey
    )}&mtu=1420#V2ray-Config`;

// Update DOM with Configurations
const updateDOM = (container, title, textareaId, content, messageId) => {
    container.innerHTML = `
        
        <h2>${title}</h2>
        <textarea id="${textareaId}" class="config-box visible" readonly>${content.trim()}</textarea>
        <button class="copy-button" data-target="${textareaId}" data-message="${messageId}">Copy ${title} Config</button>
        <p id="${messageId}" class="message" aria-live="polite"></p>
    `;
};

// Show and Hide Spinner
const showSpinner = () => {
    const spinner = document.querySelector('.spinner');
    if (spinner) spinner.style.display = 'block';
};

const hideSpinner = () => {
    const spinner = document.querySelector('.spinner');
    if (spinner) spinner.style.display = 'none';
};

// Global Event Listener for Copy Buttons
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('copy-button')) {
        const targetId = e.target.getAttribute('data-target');
        const messageId = e.target.getAttribute('data-message');
        try {
            const textArea = document.getElementById(targetId);
            await navigator.clipboard.writeText(textArea.value);
            showCopyMessage(messageId, 'Config copied!');
        } catch {
            showCopyMessage(messageId, 'Failed to copy.');
        }
    }
});

// Show Copy Success or Error Message
const showCopyMessage = (messageId, message) => {
    const showPopup = (message) => {
        const popup = document.createElement('div');
        popup.className = 'popup-message';
        popup.textContent = message;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 2000);
    };

    showPopup(message);

    const messageElement = document.getElementById(messageId);
    messageElement.textContent = message;
    setTimeout(() => (messageElement.textContent = ''), 2000);
};

// Generate Random String
const generateRandomString = (length) =>
    Array.from({ length }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
            Math.floor(Math.random() * 62)
        )
    ).join('');

// Download Configuration as File
downloadBtn.addEventListener('click', () => {
    const content = document.querySelector('#wireguardBox')?.value || "No configuration available";
    downloadConfig('wireguard.conf', content);
});

const downloadConfig = (fileName, content) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};
