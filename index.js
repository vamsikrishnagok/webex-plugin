let webex;
let receiveTranscriptionOption = true;
let transcript_final_result = "";
let meetings;
let current_meeting;
webex = window.webex = Webex.init({
  config: {
    logger: {
      level: "debug",
    },
    meetings: {
      reconnection: {
        enabled: true,
      },
      enableRtx: true,
      experimental: {
        enableUnifiedMeetings: true,
      },
    },
    // Any other sdk config we need
  },
  credentials: {
    access_token:
      "YjE0MmY1YTEtNGUxMi00MDlhLTk2NjgtODQxODNmZmIwYTFiZTRiNzFmZDgtNzc4_PF84_1eb65fdf-9643-417f-9974-ad72cae0e10f",
  },
});

webex.once("ready", () => {
  console.log("Authentication#initWebex() :: Webex Ready");
});

webex.meetings.register().then(() => {
  console.log("successful registered");
  webex.meetings
    .syncMeetings()
    .then(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(), 3000);
        })
    )
    .then(() => {
      console.log(
        "MeetingsManagement#collectMeetings() :: successfully collected meetings"
      );
      meetings = webex.meetings.getAllMeetings();

      if (webex.meetings.registered) {
        console.log(meetings);
        current_meeting = meetings[Object.keys(meetings)[0]];
        console.log(current_meeting);
        current_meeting.on(
          "meeting:receiveTranscription:started",
          (payload) => {
            if ("transcript_final_result" in payload){
              transcript_final_result =
              transcript_final_result + ", "+payload["transcription"];
            }
           
            console.log(payload);
          }
        );
      }
      const joinOptions = {
        moveToResource: false,
        resourceId: webex.devicemanager._pairedDevice
          ? webex.devicemanager._pairedDevice.identity.id
          : undefined,
        receiveTranscription: receiveTranscriptionOption,
      };

      current_meeting.join(joinOptions);
    });
});

const intervalID = setInterval(summary, 100000);

function summary() {
  // WARNING: For POST requests, body is set to null by browsers.
  var data = JSON.stringify({
    "module_name": "backend.server.utils.openai_utils",
    "method_type": "module_function",
    "method_name": "process_transcript",
    "args": [
      transcript_final_result
    ]
  });
  
  var xhr = new XMLHttpRequest();
  xhr.withCredentials = false;
  
  xhr.addEventListener("readystatechange", function() {
    if(this.readyState === 4) {
      console.log(this.responseText);
      let summary = this.responseText["result"]["summary"] 
      let summaryContainer = document.getElementById('summaryContainer')
      summaryContainer.innerHTML = `<div>${summary}</div>`

      let actionables = this.responseText["result"]["actionables"]
      let actionablesContainer = document.getElementById('actionablesContainer')
      actionablesContainer.innerHTML = `<div>${actionables}</div>`

      let time = this.responseText["result"]["agenda"]
      let timeContainer = document.getElementById('timeContainer')
      timeContainer.innerHTML = `<div>${time}</div>`
    }
  });
  
  xhr.open("POST", "http://127.0.0.1:3000/dynamic_query");
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
  xhr.send(data);














}
