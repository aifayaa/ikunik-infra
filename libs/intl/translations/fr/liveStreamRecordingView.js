export default `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
    <title>Live stream</title>
    <script type="text/javascript">
      const recordingUrl = {{- recordingUrl}};

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

      function onPageLoad() {
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
          source.src = recordingUrl;
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
