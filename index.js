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
      "MjA1ZmUzMzgtYjgzMS00ZmFhLWI3ODAtZDdlOTRlNTg1ZWUwZmRjZTEzZWUtZGRh_PF84_1eb65fdf-9643-417f-9974-ad72cae0e10f",
  },
});

webex.once("ready", () => {
  console.log("Authentication#initWebex() :: Webex Ready");
});

webex.meetings
  .register()
  .then(() => {
    webex.meetings.syncMeetings();
  })
  .finally(() => {
    if (webex.meetings.regisered) {
      meetings = webex.meetings.getAllMeetings();
      current_meeting = obj[Object.keys(meetings)[0]];
      current_meeting.on("meeting:receiveTranscription:started", (payload) => {
        transcript_final_result =
          transcript_final_result + payload["transcription"];
        console.log(payload);
      });

      const joinOptions = {
        moveToResource: false,
        resourceId: webex.devicemanager._pairedDevice
          ? webex.devicemanager._pairedDevice.identity.id
          : undefined,
        receiveTranscription: receiveTranscriptionOption,
      };

      current_meeting.join(joinOptions);
    }
  });
