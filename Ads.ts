
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