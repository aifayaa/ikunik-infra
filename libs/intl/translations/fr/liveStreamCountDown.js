export default `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
    <title>Diffusion en direct</title>
    <script type="text/javascript">
      const ts = {
        start: 'Le stream démarrera dans :',
        days: ' jours ',
        hours: ' heures ',
        minutes: ' minutes ',
        seconds: ' secondes',
        redir: 'Démarrage...',
      };

      const smhdOrder = [
        'seconds',
        'minutes',
        'hours',
        'days',
      ]

      const urlParams = new URLSearchParams(window.location.search);
      const countdownTo = {{- startDateTime}};
      const streamUrl = {{- streamUrl}};

      function loadVideoJs(callback) {
        const script = document.createElement('script');
        const hlsScript = document.createElement('script');
        const style = document.createElement('link');
        var loadCount = 0;
        window.HELP_IMPROVE_VIDEOJS = false;

        function onAllLoad() {
          loadCount++;
          if (loadCount === 3) {
            callback();
          }
        }

        script.onload = onAllLoad;  
        script.type = 'text/javascript';
        script.src = 'https://vjs.zencdn.net/7.11.4/video.min.js';

        hlsScript.onload = onAllLoad;  
        hlsScript.type = 'text/javascript';
        hlsScript.src = '//unpkg.com/@videojs/http-streaming@2.7.1/dist/videojs-http-streaming.min.js';

        style.onload = onAllLoad;  
        style.rel = 'stylesheet';
        style.type = 'text/css';
        style.href = 'https://vjs.zencdn.net/7.11.4/video-js.css';

        document.head.appendChild(style);
        document.head.appendChild(script);
        document.head.appendChild(hlsScript);
      }

      function escapeHTML(html) {
        const escape = document.createElement('textarea');
        escape.textContent = html;
        return (escape.innerHTML);
      }

      function checkTime() {
        const nowTime = Date.now();
        const tdiff = countdownTo - nowTime;
        if (tdiff <= 0) {
          document.body.innerText = ts.redir;

          loadVideoJs(function() {
            document.body.innerText = '';
            document.body.setAttribute('class', 'is-video');

            const video = document.createElement('video');
            const source = document.createElement('source');
            const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

            video.id = 'video';
            video.width = width;
            video.height = height;
            video.id = 'video';
            video.setAttribute('controls', true);
            video.setAttribute('class', 'video-js vjs-default-skin');
            video.setAttribute('preload', 'auto');
            source.src = streamUrl;
            source.type = 'application/x-mpegURL';

            video.appendChild(source);
            document.body.appendChild(video);

            const player = videojs('video');
            player.ready(function() {
              var promise = player.play();

              if (promise !== undefined) {
                promise.then(function() {
                  console.log('video auto-play OK');
                }).catch(function(error) {
                  console.error('video auto-play error', error);
                });
              }
            });
          });
        } else {
          let timeLeft = parseInt((tdiff) / 1000, 10);
          const smhd = [];
          smhd.push(timeLeft % 60);
          timeLeft = parseInt(timeLeft / 60, 10);
          if (timeLeft) {
            smhd.push(timeLeft % 60);
            timeLeft = parseInt(timeLeft / 60, 10);
          }
          if (timeLeft) {
            smhd.push(timeLeft % 24);
            timeLeft = parseInt(timeLeft / 24, 10);
          }
          if (timeLeft) {
            smhd.push(timeLeft);
          }

          let text = '';
          let i = 0;

          while(smhd.length > 0) {
            text = smhd.shift() + ts[smhdOrder[i]] + text;
            i++;
          }

          document.body.innerHTML = ts.start + '<br />' + text;
          setTimeout(checkTime, 1000);
        }
      }

      function onPageLoad() {
        checkTime();
      }
    </script>
    <style type="text/css">
      body {
        text-align: center;
        vertical-align: middle;
        font-size: 2em;
        font-weight: bold;
        padding: 10px 20px;
        height: 100%;
        width: 100%;
      }

      body.is-video {
        padding: 0 !important;
        margin: 0 !important;
      }
    </style>
  </head>
  <body onload="onPageLoad()">

  </body>
</html>
`;
