// Create a new Webex app instance
var app = new window.Webex.Application();
ACCESSTOKEN = "Y2Q3OTYxNTMtMmRjNC00N2JhLWExOWYtZGMxNmZhNjhjZmRkNzE4NDlhNjUtODdl_PF84_1eb65fdf-9643-417f-9974-ad72cae0e10f"; 
let webex;
let receiveTranscriptionOption;

const meetingsListElm = [];
var meetingsCurrentDetailsElm = "";
// Wait for onReady() promise to fulfill before using framework

function registerMeeting() {

    console.log("Entered script, got access token"); 
    console.log(ACCESSTOKEN);

    initWebex(); 
    console.log("Initialized Webex"); 

    setTimeout(function() {
        register();
        console.log("Register meeting");
    }, 1000); 

    setTimeout(function() {
        collectMeetings();
        console.log("Collected meetings");
    }, 2000); 

    setTimeout(function() {
        startReceivingTranscription(); 
        console.log("Started receiving transcription");
    }, 3000);

    setTimeout(function() {
        console.log(meetingsListElm);
        joinMeeting(meetingsListElm[0]);
        console.log("Finished, should be receiving now!!");
    }, 4000); 
}

function initWebex() {
    console.log('Authentication#initWebex()');
  
    webex =  window.webex = Webex.init({
      config: {
        logger: {
          level: 'debug'
        },
        meetings: {
          reconnection: {
            enabled: true
          },
          enableRtx: true,
          experimental: {
            enableUnifiedMeetings: true
          }
        }
        // Any other sdk config we need
      },
      credentials: {
        access_token: ACCESSTOKEN
      }
    });
  
    webex.once('ready', () => {
      console.log('Authentication#initWebex() :: Webex Ready');
    });
}
  
function register() {
    console.log('Authentication#register()');

    webex.meetings.register()
        .then(() => {
        console.log('Authentication#register() :: successfully registered');
        })
        .catch((error) => {
        console.warn('Authentication#register() :: error registering', error);
        })
        .finally(() => {
        });

    webex.meetings.on('meeting:added', (m) => {
        const {type} = m;

        if (type === 'INCOMING') {
        const newMeeting = m.meeting;

        toggleDisplay('incomingsection', true);
        newMeeting.acknowledge(type);
        }
    });
}
function collectMeetings() {
    console.log('MeetingsManagement#collectMeetings()');
    
    webex.meetings.syncMeetings()
        .then(() => new Promise((resolve) => {
        setTimeout(() => resolve(), 200);
        }))
        .then(() => {
        console.log('MeetingsManagement#collectMeetings() :: successfully collected meetings');
        const meetings = webex.meetings.getAllMeetings();
    
        if (Object.keys(meetings).length === 0) {
            return;
        }
    
        Object.keys(meetings).forEach(
            (key) => {
            meetingsListElm.push(
                generateMeetingsListItem_MODIFIED(meetings[key])
            );
            }
        );
        });
    }
    
app.onReady().then(() => {
    log("App ready. Instance", app);
    registerMeeting(); 
}).catch((errorcode) =>  {
    log("Error with code: ", Webex.Application.ErrorCodes[errorcode])
});



// Button click handler to set share URL
function handleSetShare() {
    // Replace this with the URL of your shared page
    var url = "https://www.example.com/shared.html"
    // "Shared App" is the title of the window or tab that will be created
    app.setShareUrl(url, "", "Shared App").then(() => {
        log("Set share URL", url);
    }).catch((errorcode) => {
        log("Error: ", Webex.Application.ErrorCodes[errorcode])
    });
}

// Utility function to log app messages
function log(type, data) {
    var ul = document.getElementById("console");
    var li = document.createElement("li");
    var payload = document.createTextNode(`${type}: ${JSON.stringify(data)}`);
    li.appendChild(payload)
    ul.prepend(li);
}