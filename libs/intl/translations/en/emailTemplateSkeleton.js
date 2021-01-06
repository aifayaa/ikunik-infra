export default `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
  </head>
  <body style="text-align: center;">
    <div style="text-align: left; display: inline-block; padding: 10px 20px; background-color: #eee; width: 660px; border-radius: 5px;">
      <div style="text-align: center;">
        <img alt="Crowdaa logo" src="http://d1ndui12o2femm.cloudfront.net/Crowdaa%20Emails.png" style="width: 200px; margin-top: 10px;" />
      </div>
      {{- body}}
    </div>
  </body>
</html>
`;
