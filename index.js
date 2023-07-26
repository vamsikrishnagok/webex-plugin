// Create a new Webex app instance
var app = new window.Webex.Application();
ACCESSTOKEN = "Y2Q3OTYxNTMtMmRjNC00N2JhLWExOWYtZGMxNmZhNjhjZmRkNzE4NDlhNjUtODdl_PF84_1eb65fdf-9643-417f-9974-ad72cae0e10f"; 
const myAccessToken = 'YOUR_ACCESS_TOKEN';

if (myAccessToken === 'YOUR_ACCESS_TOKEN') {
  alert('Make sure to update your access token in the index.js file!');
  return;
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

// Utility function to log app messages
function log(type="ERROR", data) {
    var ul = document.getElementById("console");
    var li = document.createElement("li");
    var payload = document.createTextNode(`${type}: ${JSON.stringify(data)}`);
    li.appendChild(payload)
    ul.prepend(li);
}