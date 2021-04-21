export default `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
    <title>Live stream</title>
    <script type="text/javascript">
      const ts = {
        start: 'The stream will start in :',
        days: ' days ',
        hours: ' hours ',
        minutes: ' minutes ',
        seconds: ' seconds',
        redir: 'Starting...',
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

      function checkTime() {
        const nowTime = Date.now();
        const tdiff = countdownTo - nowTime;
        if (tdiff <= 0) {
          document.body.innerText = ts.redir;
          document.location = streamUrl;
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
    </script>
  </head>
  <body style="text-align: center; vertical-align: middle; font-size: 2em; font-weight: bold; padding: 10px 20px;" onload="checkTime()">
  </body>
</html>
`;
