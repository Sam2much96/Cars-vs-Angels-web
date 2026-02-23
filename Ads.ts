
//Ads
/**
 * 
 *   <!-- Game Monetize ads SDK + Ads testing -->
<script src="https://html5.api.gamemonetize.com/sdk.js"></script>
<script type="text/javascript">
   window.SDK_OPTIONS = {
      gameId: "01bsf4imoujpniyvppnz89kgh6tyl6nb",
      onEvent: function (a) {
         switch (a.name) {
            case "SDK_GAME_PAUSE":
               // pause game logic / mute audio
               break;
            case "SDK_GAME_START":
               // advertisement done, resume game logic and unmute audio
               break;
            case "SDK_READY":
               // when sdk is ready
               //console.log("game is ready");
               //console.log("Banners Ads Testing>>>>>>");
               sdk.showBanner();
               break;
         }
      }
   };
(function (a, b, c) {
   var d = a.getElementsByTagName(b)[0];
   a.getElementById(c) || (a = a.createElement(b), a.id = c, a.src = "https://api.gamemonetize.com/sdk.js", d.parentNode.insertBefore(a, d))
})(document, "script", "gamemonetize-sdk"); 
</script>         

 */


// Type definitions for the Game Monetize SDK
interface SDKEvent {
  name: 'SDK_GAME_PAUSE' | 'SDK_GAME_START' | 'SDK_READY' | string;
}

interface SDKOptions {
  gameId: string;
  onEvent: (event: SDKEvent) => void;
}

interface GameMonetizeSDK {
  showBanner: () => void;
  // Add other SDK methods as needed
}

declare global {
  interface Window {
    SDK_OPTIONS: SDKOptions;
    sdk: GameMonetizeSDK;
  }
}

/**
 * Initializes the Game Monetize ads SDK
 * @param gameId - Your Game Monetize game ID
 * @param onGamePause - Callback when game should pause (during ads)
 * @param onGameStart - Callback when game should resume (after ads)
 * @param onSDKReady - Callback when SDK is ready (optional)
 */
export function initializeGameMonetizeAds(
  gameId: string,
  onGamePause: () => void,
  onGameStart: () => void,
  onSDKReady?: () => void
): void {
  // Set SDK options
  window.SDK_OPTIONS = {
    gameId: gameId,
    onEvent: (event: SDKEvent) => {
      switch (event.name) {
        case 'SDK_GAME_PAUSE':
          // Pause game logic / mute audio
          onGamePause();
          break;
        case 'SDK_GAME_START':
          // Advertisement done, resume game logic and unmute audio
          onGameStart();
          break;
        case 'SDK_READY':
          // When SDK is ready
          console.log('Game Monetize SDK is ready');
          
          // Show banner ads
          if (window.sdk && window.sdk.showBanner) {
            window.sdk.showBanner();
          }
          
          // Call optional ready callback
          if (onSDKReady) {
            onSDKReady();
          }
          break;
      }
    }
  };

  // Load the SDK script
  loadGameMonetizeScript();
}

/**
 * Dynamically loads the Game Monetize SDK script
 */
function loadGameMonetizeScript(): void {
  const doc = document;
  const scriptTag = 'script';
  const sdkId = 'gamemonetize-sdk';
  
  const firstScript = doc.getElementsByTagName(scriptTag)[0];
  
  // Only load if not already present
  if (!doc.getElementById(sdkId)) {
    const script = doc.createElement(scriptTag);
    script.id = sdkId;
    script.src = 'https://api.gamemonetize.com/sdk.js';
    
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }
  }
}

// Example usage:
/*
initializeGameMonetizeAds(
  '01bsf4imoujpniyvppnz89kgh6tyl6nb',
  () => {
    // Pause game logic
    // Mute audio
    console.log('Game paused for ad');
  },
  () => {
    // Resume game logic
    // Unmute audio
    console.log('Game resumed after ad');
  },
  () => {
    // Optional: Additional logic when SDK is ready
    console.log('SDK ready callback');
  }
);
*/