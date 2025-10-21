// LiveKit Voice Agent Widget - Embeddable Version
(function () {
    if (window.LiveKitWidgetLoaded) return;
    window.LiveKitWidgetLoaded = true;

    const config = {
        // Prioritize external config, then fall back to script source
        baseUrl: window.LiveKitWidgetConfig?.baseUrl ||
            (function () {
                const scripts = document.getElementsByTagName('script');
                const currentScript = scripts[scripts.length - 1];
                const scriptSrc = currentScript?.src;
                if (scriptSrc) {
                    const url = new URL(scriptSrc);
                    return url.origin;
                }
                return window.location.origin;
            })(),
        version: '1.0.0'
    };


    let room = null;
    let isConnected = false;

    function injectCSS() {
        const css = `
      #livekit-widget-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      #livekit-widget-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
        position: relative;
      }
      
      #livekit-widget-button:hover {
        transform: scale(1.1);
      }
      
      #livekit-widget-button svg {
        width: 28px;
        height: 28px;
        fill: white;
      }
      
      #livekit-widget-button.connected {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        50% { box-shadow: 0 4px 20px rgba(245, 87, 108, 0.4); }
      }
      
      #livekit-widget-popup {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 380px;
        max-width: calc(100vw - 40px);
        height: 550px;
        max-height: calc(100vh - 120px);
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: slideUp 0.3s ease-out;
      }
      
      #livekit-widget-popup.open {
        display: flex;
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      #livekit-widget-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      #livekit-widget-header.connected {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
      
      #livekit-widget-close {
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 24px;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      #livekit-widget-status {
        font-size: 12px;
        opacity: 0.9;
        margin-top: 4px;
      }
      
      #livekit-widget-transcriptions {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #f8f9fa;
      }
      
      .livekit-message {
        margin-bottom: 16px;
        animation: fadeIn 0.3s ease-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .livekit-message-header {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .livekit-message.user .livekit-message-header {
        color: #667eea;
      }
      
      .livekit-message.agent .livekit-message-header {
        color: #f5576c;
      }
      
      .livekit-message-content {
        background: white;
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        font-size: 14px;
        line-height: 1.5;
        color: #333;
      }
      
      .livekit-message.user .livekit-message-content {
        border-left: 3px solid #667eea;
      }
      
      .livekit-message.agent .livekit-message-content {
        border-left: 3px solid #f5576c;
      }
      
      .livekit-message-interim {
        opacity: 0.6;
        font-style: italic;
      }
      
      #livekit-widget-controls {
        padding: 16px;
        background: white;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 12px;
      }
      
      .livekit-control-btn {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      #livekit-start-call {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      #livekit-start-call:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }
      
      #livekit-end-call {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        display: none;
      }
      
      #livekit-end-call:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);
      }
      
      .livekit-control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }
      
      .livekit-empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #666;
      }
      
      .livekit-empty-state svg {
        width: 64px;
        height: 64px;
        opacity: 0.3;
        margin-bottom: 16px;
      }
      
      .livekit-loading {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      @media (max-width: 480px) {
        #livekit-widget-popup {
          width: calc(100vw - 40px);
          height: calc(100vh - 120px);
        }
      }
    `;

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    function createWidget() {
        const container = document.createElement('div');
        container.id = 'livekit-widget-container';
        container.innerHTML = `
      <button id="livekit-widget-button" aria-label="Open voice assistant">
        <svg viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      </button>
      
      <div id="livekit-widget-popup">
        <div id="livekit-widget-header">
          <div>
            <h3 style="margin: 0; font-size: 18px;">AI Voice Assistant</h3>
            <div id="livekit-widget-status">Ready to connect</div>
          </div>
          <button id="livekit-widget-close" aria-label="Close widget">&times;</button>
        </div>
        
        <div id="livekit-widget-transcriptions">
          <div class="livekit-empty-state">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            <p>Click "Start Call" to begin talking with the AI assistant</p>
          </div>
        </div>
        
        <div id="livekit-widget-controls">
          <button id="livekit-start-call" class="livekit-control-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
            </svg>
            Start Call
          </button>
          <button id="livekit-end-call" class="livekit-control-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
            End Call
          </button>
        </div>
      </div>
    `;

        document.body.appendChild(container);
        attachEventListeners();
    }

    function log(message, type = 'info') {
        console.log(`[LiveKit Widget] ${message}`);
    }

    function updateStatus(message, isConnected = false) {
        const statusEl = document.getElementById('livekit-widget-status');
        const headerEl = document.getElementById('livekit-widget-header');
        const buttonEl = document.getElementById('livekit-widget-button');

        if (statusEl) statusEl.textContent = message;
        if (headerEl && isConnected) {
            headerEl.classList.add('connected');
            buttonEl.classList.add('connected');
        } else {
            headerEl.classList.remove('connected');
            buttonEl.classList.remove('connected');
        }
    }

    function addMessage(text, isAgent = false, isFinal = true) {
        const container = document.getElementById('livekit-widget-transcriptions');
        const emptyState = container.querySelector('.livekit-empty-state');
        if (emptyState) emptyState.remove();

        const messageType = isAgent ? 'agent' : 'user';
        const interimId = `interim-${messageType}`;

        // If this is an interim message, update or create the interim bubble
        if (!isFinal) {
            let interimMsg = document.getElementById(interimId);
            if (!interimMsg) {
                interimMsg = document.createElement('div');
                interimMsg.id = interimId;
                interimMsg.className = `livekit-message ${messageType}`;
                interimMsg.innerHTML = `
        <div class="livekit-message-header">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            ${isAgent ?
                        '<path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm7.5-1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zM8 15h8v2H8v-2z"/>'
                        : '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>'}
          </svg>
          ${isAgent ? 'AI Assistant' : 'You'}
        </div>
        <div class="livekit-message-content livekit-message-interim">${text}</div>
      `;
                container.appendChild(interimMsg);
            } else {
                interimMsg.querySelector('.livekit-message-content').textContent = text;
            }
            container.scrollTop = container.scrollHeight;
            return;
        }

        // If this is a final message, remove any interim message and create final one
        const existingInterim = document.getElementById(interimId);
        if (existingInterim) {
            existingInterim.remove();
        }

        // Create final message
        const messageEl = document.createElement('div');
        messageEl.className = `livekit-message ${messageType}`;
        messageEl.innerHTML = `
    <div class="livekit-message-header">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        ${isAgent ?
                '<path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm7.5-1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zM8 15h8v2H8v-2z"/>'
                : '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>'}
      </svg>
      ${isAgent ? 'AI Assistant' : 'You'}
    </div>
    <div class="livekit-message-content">${text}</div>
  `;

        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    async function startCall() {
        const startBtn = document.getElementById('livekit-start-call');
        const endBtn = document.getElementById('livekit-end-call');

        try {
            startBtn.disabled = true;
            startBtn.innerHTML = '<span class="livekit-loading"></span> Connecting...';
            updateStatus('Connecting...', false);

            // Get token from server
            log('Fetching token...');
            const response = await fetch(`${config.baseUrl}/get_token`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to get token');
            }

            log(`Connecting to room: ${data.room}`);

            // Create room
            room = new LivekitClient.Room({
                audio: true,
                video: false,
                publishDefaults: {
                    microphone: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                }
            });

            // Set up event listeners
            room.on('connected', async () => {
                log('Connected to room');
                isConnected = true;
                updateStatus('Connected - Listening...', true);

                startBtn.style.display = 'none';
                endBtn.style.display = 'flex';

                // Enable microphone
                try {
                    await room.localParticipant.setMicrophoneEnabled(true);
                    log('Microphone enabled');
                    addMessage('Microphone Connected!', false, true);
                } catch (error) {
                    log(`Microphone error: ${error.message}`);
                    addMessage('Error: Could not access microphone', false, true);
                }
            });

            room.on('disconnected', () => {
                log('Disconnected from room');
                isConnected = false;
                updateStatus('Disconnected', false);

                startBtn.style.display = 'flex';
                startBtn.disabled = false;
                startBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
          </svg>
          Start Call
        `;
                endBtn.style.display = 'none';
            });

            room.on('participantConnected', (participant) => {
                log(`Participant joined: ${participant.identity} (${participant.kind})`);
                if (!participant.isLocal) {
                    updateStatus('AI Assistant connected', true);
                    addMessage('AI Assistant has joined the call', true, true);
                }
            });

            room.on('participantDisconnected', (participant) => {
                log(`Participant left: ${participant.identity}`);
            });

            room.on('trackSubscribed', (track, publication, participant) => {
                log(`Track subscribed: ${track.kind} from ${participant.identity}`);

                if (track.kind === 'audio') {
                    const audioEl = track.attach();
                    audioEl.autoplay = true;
                    audioEl.play().catch(err => log(`Audio play failed: ${err.message}`));
                    document.body.appendChild(audioEl);
                }
            });

            room.on('transcriptionReceived', (transcriptionSegments, participant) => {
                transcriptionSegments.forEach(segment => {
                    const isAgent = !participant.isLocal;
                    // log(`Transcription from ${participant.identity}: ${segment.text} (final: ${segment.final})`);
                    addMessage(segment.text, isAgent, segment.final);
                });
            });

            // Listen for transcriptions
            // const shownSegments = new Set();

            // room.on('transcriptionReceived', (segments, participant) => {
            //     // console.log("🔊 Transcription from:", participant.identity, participant.isLocal, segments);
            //     const isAgent = !participant.isLocal;  // true for remote participant
            //     for (const s of segments) {
            //         const key = `${participant.identity}:${s.text}`;
            //         if (shownSegments.has(key)) continue;     // skip duplicates
            //         shownSegments.add(key);
            //         // log(`Transcription from ${participant.identity}: ${s.text} (final: ${s.final})`);
            //         addMessage(s.text, isAgent, s.final);
            //     }
            // });

            // Connect to room
            await room.connect(data.url, data.token);

        } catch (error) {
            log(`Connection error: ${error.message}`);
            updateStatus('Connection failed', false);
            addMessage(`Error: ${error.message}`, false, true);

            startBtn.disabled = false;
            startBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
        </svg>
        Start Call
      `;
        }
    }

    async function endCall() {
        if (room) {
            log('Ending call...');
            updateStatus('Disconnecting...', false);
            addMessage('Call ended', false, true);
            await room.disconnect();
            room = null;
        }
    }

    function attachEventListeners() {
        const button = document.getElementById('livekit-widget-button');
        const popup = document.getElementById('livekit-widget-popup');
        const closeBtn = document.getElementById('livekit-widget-close');
        const startBtn = document.getElementById('livekit-start-call');
        const endBtn = document.getElementById('livekit-end-call');

        button.addEventListener('click', () => {
            popup.classList.toggle('open');
        });

        closeBtn.addEventListener('click', () => {
            popup.classList.remove('open');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#livekit-widget-container')) {
                popup.classList.remove('open');
            }
        });

        startBtn.addEventListener('click', startCall);
        endBtn.addEventListener('click', endCall);
    }

    function init() {
        function setup() {
            injectCSS();
            createWidget();
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/livekit-client@2.15.12/dist/livekit-client.umd.js';
        script.onload = () => {
            log('✅ LiveKit SDK loaded');
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setup);
            } else {
                setup();
            }
        };
        script.onerror = () => console.error('❌ Failed to load LiveKit SDK');
        document.head.appendChild(script);
    }


    init();
})();