export const HackingEffects = {
    init: function () {
        // Prepare DOM for fourth-wall breaking glitches
        const uiLayer = document.getElementById('uiLayer');

        // Notification Container
        this.notifContainer = document.createElement('div');
        this.notifContainer.id = 'notifContainer';
        this.notifContainer.style.position = 'absolute';
        this.notifContainer.style.bottom = '20px';
        this.notifContainer.style.right = '20px';
        this.notifContainer.style.display = 'flex';
        this.notifContainer.style.flexDirection = 'column';
        this.notifContainer.style.gap = '10px';
        this.notifContainer.style.zIndex = '99999';
        uiLayer.appendChild(this.notifContainer);

        // Fake BSOD Screen
        this.bsodScreen = document.createElement('div');
        this.bsodScreen.id = 'bsodScreen';
        this.bsodScreen.style.position = 'absolute';
        this.bsodScreen.style.top = '0';
        this.bsodScreen.style.left = '0';
        this.bsodScreen.style.width = '100VW';
        this.bsodScreen.style.height = '100VH';
        this.bsodScreen.style.backgroundColor = '#0000aa';
        this.bsodScreen.style.color = 'white';
        this.bsodScreen.style.fontFamily = '"Lucida Console", Monaco, monospace';
        this.bsodScreen.style.padding = '50px';
        this.bsodScreen.style.boxSizing = 'border-box';
        this.bsodScreen.style.zIndex = '100000';
        this.bsodScreen.style.display = 'none';
        this.bsodScreen.innerHTML = `
            <h2>A problem has been detected and windows has been shut down to prevent damage to your computer.</h2>
            <br><p>SYSTEM_THREAD_EXCEPTION_NOT_HANDLED</p>
            <br><p>If this is the first time you've seen this error screen, restart your computer. If this screen appears again, follow these steps:</p>
            <br><p>Check to make sure any new hardware or software is properly installed... LOOK BEHIND YOU.</p>
        `;
        document.body.appendChild(this.bsodScreen);
    },

    triggerFakeNotification: function (title, message) {
        const notif = document.createElement('div');
        notif.style.backgroundColor = '#2d2d2d';
        notif.style.border = '1px solid #444';
        notif.style.borderRadius = '8px';
        notif.style.padding = '15px';
        notif.style.width = '300px';
        notif.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        notif.style.color = 'white';
        notif.style.fontFamily = 'Arial, sans-serif';
        notif.style.transform = 'translateY(50px)';
        notif.style.opacity = '0';
        notif.style.transition = 'all 0.3s ease-out';

        notif.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px; display: flex; align-items: center;">
                <span style="color: #ff3b3b; margin-right: 8px;">⚠️ System Alert</span>
            </div>
            <div style="font-size: 14px; color: #ccc;">${message}</div>
        `;

        this.notifContainer.appendChild(notif);

        // Animate In
        setTimeout(() => {
            notif.style.transform = 'translateY(0)';
            notif.style.opacity = '1';
        }, 50);

        // Animate Out & Remove
        setTimeout(() => {
            notif.style.transform = 'translateX(50px)';
            notif.style.opacity = '0';
            setTimeout(() => {
                notif.remove();
            }, 300);
        }, 5000);
    },

    triggerFakeDownload: function (filename = "UR_NEXT.txt") {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent("Why are you still playing?"));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    },

    triggerBSOD: function (duration = 3000) {
        this.bsodScreen.style.display = 'block';

        // Remove fullscreen briefly to shock them if needed, but might break immersion. 
        // Just covering the screen is enough.

        setTimeout(() => {
            this.bsodScreen.style.display = 'none';
            // "Just kidding"
            this.triggerFakeNotification("Simulation", "Just kidding. Continue?");
        }, duration);
    }
};
