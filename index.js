// Create a new Webex app instance
var app = new window.Webex.Application();
ACCESSTOKEN = "NWQxMzFkM2QtNjgyMi00NGZiLTk4NDctYjk4YWRlZWQ3ZTllNWEyNmU3M2YtNDhl_PF84_1eb65fdf-9643-417f-9974-ad72cae0e10f"; 
const myAccessToken = ACCESSTOKEN;

if (myAccessToken === ACCESSTOKEN) {
  alert('Make sure to update your access token in the index.js file!');
  return true;
}

const webex = window.Webex.init({
  credentials: {
    access_token: ACCESSTOKEN
  },
  logger: {
    level: 'debug'
  }
});

webex.meetings.register()
  .catch((err) => {
    log("err",err);
    alert(err);
    throw err;
  });

function getCurrentMeeting() {
    const meetings = webex.meetings.getAllMeetings();
    console.log(meetings)
    return meetings[Object.keys(meetings)[0]];
  }
// Utility function to log app messages
function log(type="ERROR", data) {
    var ul = document.getElementById("console");
    var li = document.createElement("li");
    var payload = document.createTextNode(`${type}: ${JSON.stringify(data)}`);
    li.appendChild(payload)
    ul.prepend(li);
}