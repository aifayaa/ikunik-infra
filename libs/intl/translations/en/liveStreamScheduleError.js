export default `
<h3>
  The live stream <u>{{liveStreamName}}</u> automatic start scheduling <u>{{liveStreamStartDate}} (GMT+0)</u> failed. Please try again later.<br>
  If necessary, you will need to start it manually a few minutes before the start date to be able to start broadcasting.
</h3>
<br>
<h3>Here are details about the encountered error: </h3>
<p>
  {{error}}
</p>
`;
