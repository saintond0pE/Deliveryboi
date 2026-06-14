/* -------------------------------------------------------------
   DELIVERYBOI CLIENT-SIDE LOGIC & SUPABASE INTEGRATION
   ------------------------------------------------------------- */

// Helper to load .env variables locally
async function loadEnv() {
    try {
        const response = await fetch('.env');
        if (!response.ok) throw new Error('No .env file found');
        const text = await response.text();
        const env = {};
        text.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) return;
            const parts = trimmedLine.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                env[key] = value;
            }
        });
        return env;
    } catch (err) {
        console.warn("Using fallback credentials (make sure to set up Supabase)");
        return {};
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    
    // -------------------------------------------------------------
    // INITIALIZE SUPABASE
    // -------------------------------------------------------------
    const env = await loadEnv();
    const supabaseUrl = env.SUPABASE_URL || 'https://zgiomvnellnxwcrtbrjy.supabase.co';
    const supabaseAnonKey = env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnaW9tdm5lbGxueHdjcnRicmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzU0MzUsImV4cCI6MjA5NzAxMTQzNX0.W3G7l1I8_O98SHn23_4YcGdPtjPGRX9lA8u2SHhmEgg';
    
    let supabase;
    try {
        supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
        console.error("Supabase initialization failed", e);
        alert("Failed to load Supabase client. Check script reference.");
        return;
    }

    // Core Application State
    const state = {
        user: null,
        activeScreen: 'login',
        upload: {
            type: 'audio', // default type
            fileData: null,
            fileName: '',
            fileSize: 0,
            fileMime: ''
        },
        decrypt: {
            packetId: null,
            packetData: null
        }
    };

    // DOM Elements
    const screens = {
        login: document.getElementById('screen-login'),
        intro: document.getElementById('screen-intro'),
        create: document.getElementById('screen-create'),
        decrypt: document.getElementById('screen-decrypt')
    };

    const sidebar = document.getElementById('app-sidebar');
    const headerUserBadge = document.getElementById('header-user-badge');
    const headerUserEmail = document.getElementById('header-user-email');
    const btnLogout = document.getElementById('btn-logout');

    const btnNavHome = document.getElementById('btn-nav-home');
    const btnNavCreate = document.getElementById('btn-nav-create');
    const btnNavDecrypt = document.getElementById('btn-nav-decrypt');
    
    // Auth Screen elements
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const formSignin = document.getElementById('form-signin');
    const formSignup = document.getElementById('form-signup');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const btnSignin = document.getElementById('btn-signin');
    const authError = document.getElementById('auth-error');

    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const btnSignupSubmit = document.getElementById('btn-signup-submit');
    const signupError = document.getElementById('signup-error');

    // OAuth buttons
    const btnOauthGoogle = document.getElementById('btn-oauth-google');
    const btnOauthGithub = document.getElementById('btn-oauth-github');

    // Intro Screen elements
    const btnGetStarted = document.getElementById('btn-get-started');
    const historyTableBody = document.getElementById('history-table-body');

    // Create Screen elements
    const typeChips = document.querySelectorAll('.type-chips .chip');
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const fileSelectedName = document.getElementById('file-selected-name');
    const packetPasswordInput = document.getElementById('packet-password');
    const btnEncryptDispatch = document.getElementById('btn-encrypt-dispatch');
    const dispatchSuccessContainer = document.getElementById('dispatch-success-container');
    const generatedUrlInput = document.getElementById('generated-url');
    const btnCopyUrl = document.getElementById('btn-copy-url');

    // Decrypt Screen elements
    const decryptPacketIdText = document.getElementById('decrypt-packet-id');
    const decryptPasswordInput = document.getElementById('decrypt-password');
    const btnDecrypt = document.getElementById('btn-decrypt');
    const decryptError = document.getElementById('decrypt-error');
    const decryptedPayloadContainer = document.getElementById('decrypted-payload-container');
    
    // Decrypted viewer modules
    const payloadAudioPlayer = document.getElementById('payload-audio-player');
    const payloadImageViewer = document.getElementById('payload-image-viewer');
    const payloadFileDownloader = document.getElementById('payload-file-downloader');
    const decryptedAudio = document.getElementById('decrypted-audio');
    const decryptedImage = document.getElementById('decrypted-image');
    const decryptedFileName = document.getElementById('decrypted-file-name');
    const decryptedFileSize = document.getElementById('decrypted-file-size');
    const btnDownloadFile = document.getElementById('btn-download-file');
    const audioPlayPause = document.getElementById('audio-play-pause');
    const localKeysCount = document.getElementById('local-keys-count');

    // Check if there is an incoming delivery parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const incomingDeliveryId = urlParams.get('d');

    // Navigation function
    function showScreen(screenId) {
        Object.keys(screens).forEach(key => {
            if (key === screenId) {
                screens[key].classList.add('active');
            } else {
                screens[key].classList.remove('active');
            }
        });
        state.activeScreen = screenId;

        // Toggle active sidebar buttons
        btnNavHome.classList.remove('active');
        btnNavCreate.classList.remove('active');
        btnNavDecrypt.classList.remove('active');

        if (screenId === 'intro') btnNavHome.classList.add('active');
        if (screenId === 'create') btnNavCreate.classList.add('active');
        if (screenId === 'decrypt') btnNavDecrypt.classList.add('active');
    }

    // Toggle Sign In / Sign Up Forms
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        formSignin.classList.add('active');
        formSignup.classList.remove('active');
        authError.style.display = 'none';
    });

    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        formSignup.classList.add('active');
        formSignin.classList.remove('active');
        signupError.style.display = 'none';
    });

    // -------------------------------------------------------------
    // SUPABASE AUTHENTICATION
    // -------------------------------------------------------------
    
    // Check initial session
    const { data: { session } } = await supabase.auth.getSession();
    handleAuthStateChange(session);

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        handleAuthStateChange(session);
    });

    function handleAuthStateChange(session) {
        if (session) {
            state.user = session.user;
            headerUserEmail.textContent = session.user.email;
            headerUserBadge.style.display = 'flex';
            sidebar.style.display = 'flex';
            
            // Reload user deliveries count & history table
            updateUserHistory();

            if (incomingDeliveryId && state.activeScreen === 'login') {
                loadIncomingDelivery(incomingDeliveryId);
            } else if (state.activeScreen === 'login') {
                showScreen('intro');
            }
        } else {
            state.user = null;
            headerUserBadge.style.display = 'none';
            sidebar.style.display = 'none';
            showScreen('login');
        }
    }

    // Sign In handler
    btnSignin.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value.trim();

        if (!email || !password) return;

        btnSignin.textContent = 'AUTHENTICATING...';
        btnSignin.disabled = true;
        authError.style.display = 'none';

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            authError.textContent = error.message;
            authError.style.display = 'block';
            btnSignin.textContent = 'AUTHENTICATE';
            btnSignin.disabled = false;
        }
    });

    // Sign Up handler
    btnSignupSubmit.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = signupEmailInput.value.trim();
        const password = signupPasswordInput.value.trim();

        if (!email || !password) return;

        btnSignupSubmit.textContent = 'CREATING...';
        btnSignupSubmit.disabled = true;
        signupError.style.display = 'none';

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            signupError.textContent = error.message;
            signupError.style.display = 'block';
            btnSignupSubmit.textContent = 'CREATE ACCOUNT';
            btnSignupSubmit.disabled = false;
        } else {
            alert('Signup successful! You can now log in.');
            tabLogin.click();
            btnSignupSubmit.textContent = 'CREATE ACCOUNT';
            btnSignupSubmit.disabled = false;
        }
    });

    // Social Provider OAuth Logins
    btnOauthGoogle.addEventListener('click', () => signInWithProvider('google'));
    btnOauthGithub.addEventListener('click', () => signInWithProvider('github'));

    async function signInWithProvider(provider) {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        if (error) {
            console.error(`Login with ${provider} failed:`, error.message);
            alert(`Login with ${provider} failed: ${error.message}`);
        }
    }

    // Logout handler
    btnLogout.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.history.replaceState({}, document.title, window.location.pathname);
    });

    // Navigation triggers
    btnNavHome.addEventListener('click', () => { if (state.user) showScreen('intro'); });
    btnNavCreate.addEventListener('click', () => { if (state.user) showScreen('create'); });
    btnNavDecrypt.addEventListener('click', () => { if (state.user) showScreen('decrypt'); });
    btnGetStarted.addEventListener('click', () => showScreen('create'));

    // -------------------------------------------------------------
    // USER DEPLOYMENT HISTORY
    // -------------------------------------------------------------
    
    async function updateUserHistory() {
        if (!state.user) return;

        const { data, error } = await supabase
            .from('deliveries')
            .select('id, file_name, file_type, file_size, created_at, is_received')
            .eq('sender_id', state.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching history:", error);
            return;
        }

        localKeysCount.textContent = `${data.length} SENT`;

        if (data.length === 0) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">NO FILES DISPATCHED YET</td>
                </tr>
            `;
            return;
        }

        historyTableBody.innerHTML = '';
        data.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
            });
            const statusClass = item.is_received ? 'received' : 'pending';
            const statusText = item.is_received ? 'Received' : 'Pending';
            
            const baseUrl = window.location.origin + window.location.pathname;
            const linkUrl = `${baseUrl}?d=${item.id}`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(item.file_name)}</strong></td>
                <td><span class="text-orange">${item.file_type.toUpperCase()}</span></td>
                <td>${formatBytes(item.file_size)}</td>
                <td>${date}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-text btn-copy-history" data-url="${linkUrl}">COPY LINK</button>
                </td>
            `;
            historyTableBody.appendChild(tr);
        });

        // Add copy triggers to table buttons
        document.querySelectorAll('.btn-copy-history').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.target.getAttribute('data-url');
                navigator.clipboard.writeText(url);
                const originalText = e.target.textContent;
                e.target.textContent = 'COPIED!';
                setTimeout(() => { e.target.textContent = originalText; }, 1500);
            });
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // -------------------------------------------------------------
    // FILE DISPATCH UPLOAD FLOW
    // -------------------------------------------------------------
    
    // Toggle selector chips
    typeChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            typeChips.forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            state.upload.type = e.target.getAttribute('data-type');
            resetUploadZone();
        });
    });

    uploadZone.addEventListener('click', () => fileInput.click());
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--neon-cyan)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--neon-orange)';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--neon-orange)';
        if (e.dataTransfer.files.length > 0) {
            handleSelectedFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleSelectedFile(e.target.files[0]);
        }
    });

    function resetUploadZone() {
        fileInput.value = '';
        state.upload.fileData = null;
        state.upload.fileName = '';
        state.upload.fileSize = 0;
        state.upload.fileMime = '';
        fileSelectedName.textContent = 'No file selected (Max size: 5MB)';
        checkDispatchValidity();
    }

    function handleSelectedFile(file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('File exceeds 5MB size limit.');
            resetUploadZone();
            return;
        }

        state.upload.fileName = file.name;
        state.upload.fileSize = file.size;
        state.upload.fileMime = file.type;

        const reader = new FileReader();
        reader.onload = function(e) {
            state.upload.fileData = e.target.result; // Base64 Data URL
            fileSelectedName.innerHTML = `✓ SELECTED: <strong class="text-cyan">${file.name}</strong> (${formatBytes(file.size)})`;
            checkDispatchValidity();
        };
        reader.readAsDataURL(file);
    }

    function checkDispatchValidity() {
        const hasFile = state.upload.fileData !== null;
        const hasPassword = packetPasswordInput.value.length > 0;
        btnEncryptDispatch.disabled = !(hasFile && hasPassword);
    }

    packetPasswordInput.addEventListener('input', checkDispatchValidity);

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // -------------------------------------------------------------
    // WEB CRYPTO API ENCRYPTION & DECRYPTION
    // -------------------------------------------------------------
    
    async function deriveKey(password, salt) {
        const enc = new TextEncoder();
        const baseKey = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await window.crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(hash)));
    }

    async function encryptPayload(base64Data, password) {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(password, salt);
        
        const enc = new TextEncoder();
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            enc.encode(base64Data)
        );

        const saltBase64 = btoa(String.fromCharCode(...salt));
        const ivBase64 = btoa(String.fromCharCode(...iv));
        const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));

        return {
            salt: saltBase64,
            iv: ivBase64,
            ciphertext: cipherBase64
        };
    }

    async function decryptPayload(ciphertextBase64, password, saltBase64, ivBase64) {
        const salt = new Uint8Array(atob(saltBase64).split('').map(c => c.charCodeAt(0)));
        const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
        const ciphertext = new Uint8Array(atob(ciphertextBase64).split('').map(c => c.charCodeAt(0)));

        const key = await deriveKey(password, salt);
        
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );

        const dec = new TextDecoder();
        return dec.decode(decryptedBuffer);
    }

    // -------------------------------------------------------------
    // DISPATCH DISPATCH EVENT HANDLER
    // -------------------------------------------------------------
    btnEncryptDispatch.addEventListener('click', async () => {
        if (!state.user) return;
        
        const password = packetPasswordInput.value;
        const fileType = state.upload.type;
        const fileData = state.upload.fileData; // base64
        const fileName = state.upload.fileName;
        const fileSize = state.upload.fileSize;

        btnEncryptDispatch.textContent = 'ENCRYPTING...';
        btnEncryptDispatch.disabled = true;

        try {
            // 1. Client-side browser encrypt
            const encrypted = await encryptPayload(fileData, password);
            
            // 2. Hash password for double verification verification
            const pwHash = await hashPassword(password);

            // 3. Save entry to Supabase deliveries table
            const { data, error } = await supabase
                .from('deliveries')
                .insert([
                    {
                        sender_id: state.user.id,
                        file_name: fileName,
                        file_type: fileType,
                        file_size: fileSize,
                        encrypted_data: encrypted.ciphertext,
                        password_hash: pwHash,
                        salt: encrypted.salt,
                        iv: encrypted.iv,
                        is_received: false
                    }
                ])
                .select();

            if (error) throw error;

            // 4. Construct unique access link
            const baseUrl = window.location.origin + window.location.pathname;
            const fullUrl = `${baseUrl}?d=${data[0].id}`;

            generatedUrlInput.value = fullUrl;
            dispatchSuccessContainer.style.display = 'flex';
            
            btnEncryptDispatch.textContent = 'DISPATCH COMPLETE';
            
            // Refresh dashboard lists
            updateUserHistory();
            resetUploadZone();
            packetPasswordInput.value = '';

        } catch (error) {
            console.error('Dispatch failed:', error);
            alert('Dispatch failed: ' + error.message);
            btnEncryptDispatch.textContent = 'ENCRYPT & DISPATCH';
            btnEncryptDispatch.disabled = false;
        }
    });

    btnCopyUrl.addEventListener('click', () => {
        generatedUrlInput.select();
        navigator.clipboard.writeText(generatedUrlInput.value);
        btnCopyUrl.textContent = 'COPIED!';
        setTimeout(() => { btnCopyUrl.textContent = 'COPY LINK'; }, 2000);
    });

    // -------------------------------------------------------------
    // RECEIVER PAGE FLOW
    // -------------------------------------------------------------
    
    async function loadIncomingDelivery(hashId) {
        state.decrypt.packetId = hashId;
        
        // Fetch specific delivery record from Supabase
        const { data, error } = await supabase
            .from('deliveries')
            .select('*')
            .eq('id', hashId)
            .single();
        
        if (error || !data) {
            console.error("Fetch delivery failed", error);
            alert(`Delivery packet '${hashId}' was not found or has been deleted.`);
            window.history.replaceState({}, document.title, window.location.pathname);
            showScreen('intro');
            return;
        }

        state.decrypt.packetData = data;
        decryptPacketIdText.textContent = data.file_name;
        showScreen('decrypt');
        
        // Reset view
        decryptPasswordInput.value = '';
        decryptError.style.display = 'none';
        decryptedPayloadContainer.style.display = 'none';
    }

    // Decrypt button event handler
    btnDecrypt.addEventListener('click', async () => {
        const password = decryptPasswordInput.value;
        const packet = state.decrypt.packetData;

        if (!packet) return;

        decryptError.style.display = 'none';
        btnDecrypt.textContent = 'DECRYPTING...';
        btnDecrypt.disabled = true;

        try {
            // Verify password hash
            const inputPwHash = await hashPassword(password);
            if (inputPwHash !== packet.password_hash) {
                throw new Error("Password authentication failed");
            }

            // Client-side Decrypt
            const decryptedBase64 = await decryptPayload(
                packet.encrypted_data,
                password,
                packet.salt,
                packet.iv
            );

            // Successfully Decrypted! Mark package received in Supabase
            const { error: updateError } = await supabase
                .from('deliveries')
                .update({ 
                    is_received: true, 
                    received_at: new Date().toISOString() 
                })
                .eq('id', packet.id);

            if (updateError) console.warn("Failed to update status:", updateError);

            displayPayload(packet.file_type, decryptedBase64, packet.file_name, packet.file_size);
            btnDecrypt.textContent = 'DECRYPTED';

        } catch (error) {
            console.error('Decryption failed:', error);
            decryptError.style.display = 'block';
            decryptedPayloadContainer.style.display = 'none';
            btnDecrypt.textContent = 'DECRYPT & OPEN FILE';
            btnDecrypt.disabled = false;
        }
    });

    function displayPayload(type, base64Url, name, size) {
        payloadAudioPlayer.style.display = 'none';
        payloadImageViewer.style.display = 'none';
        payloadFileDownloader.style.display = 'none';
        decryptedAudio.pause();

        decryptedPayloadContainer.style.display = 'block';

        if (type === 'audio') {
            payloadAudioPlayer.style.display = 'block';
            decryptedAudio.src = base64Url;
            document.getElementById('audio-file-name').textContent = `${name} (${formatBytes(size)})`;
            audioPlayPause.textContent = 'PLAY';
        } 
        else if (type === 'image') {
            payloadImageViewer.style.display = 'block';
            decryptedImage.src = base64Url;
        } 
        else {
            payloadFileDownloader.style.display = 'block';
            decryptedFileName.textContent = name;
            decryptedFileSize.textContent = formatBytes(size);
            btnDownloadFile.href = base64Url;
            btnDownloadFile.download = name;
        }
    }

    audioPlayPause.addEventListener('click', () => {
        if (decryptedAudio.paused) {
            decryptedAudio.play();
            audioPlayPause.textContent = 'PAUSE';
        } else {
            decryptedAudio.pause();
            audioPlayPause.textContent = 'PLAY';
        }
    });

    decryptedAudio.addEventListener('ended', () => {
        audioPlayPause.textContent = 'PLAY';
    });

});
