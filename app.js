/* eslint-disable no-underscore-dangle */
/* eslint-env browser */

/* global Webex */

/* eslint-disable require-jsdoc */
/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-global-assign */
/* eslint-disable no-multi-assign */
/* eslint-disable max-len */

// Globals
let webex;
let receiveTranscriptionOption;

const tokenElm = document.querySelector('#access-token');
const saveElm = document.querySelector('#access-token-save');
const authStatusElm = document.querySelector('#access-token-status');
const registerElm = document.querySelector('#registration-register');
const unregisterElm = document.querySelector('#registration-unregister');
const registrationStatusElm = document.querySelector('#registration-status');

// Disable screenshare on join in Safari patch
const isSafari = /Version\/[\d.]+.*Safari/.test(navigator.userAgent);
const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Store and Grab `access-token` from localstorage
if (localStorage.getItem('date') > new Date().getTime()) {
  tokenElm.value = localStorage.getItem('access-token');
}
else {
  localStorage.removeItem('access-token');
}

tokenElm.addEventListener('change', (event) => {
  localStorage.setItem('access-token', event.target.value);
  localStorage.setItem('date', new Date().getTime() + (12 * 60 * 60 * 1000));
});

if (isSafari || isiOS) {
  document.getElementById('sendShareToggle').disabled = true;
}

function initWebex() {
  console.log('Authentication#initWebex()');

  tokenElm.disabled = true;
  saveElm.disabled = true;
  authStatusElm.innerText = 'initializing...';

  webex = window.webex = Webex.init({
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
      access_token: tokenElm.value
    }
  });

  webex.once('ready', () => {
    console.log('Authentication#initWebex() :: Webex Ready');
    registerElm.disabled = false;
    authStatusElm.innerText = 'Saved';
  });
}

function register() {
  console.log('Authentication#register()');
  registerElm.disabled = true;
  unregisterElm.disabled = true;
  registrationStatusElm.innerText = 'Registering...';

  webex.meetings.register()
    .then(() => {
      console.log('Authentication#register() :: successfully registered');
      unregisterElm.disabled = false;
    })
    .catch((error) => {
      console.warn('Authentication#register() :: error registering', error);
      registerElm.disabled = false;
    })
    .finally(() => {
      registrationStatusElm.innerText = webex.meetings.registered ?
        'Registered' :
        'Not Registered';
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

function unregister() {
  console.log('Authentication#unregister()');
  registerElm.disabled = true;
  unregisterElm.disabled = true;
  registrationStatusElm.innerText = 'Unregistering...';

  webex.meetings.unregister()
    .then(() => {
      console.log('Authentication#register() :: successfully unregistered');
      registerElm.disabled = false;
    })
    .catch((error) => {
      console.warn('Authentication#register() :: error unregistering', error);
      unregisterElm.disabled = false;
    })
    .finally(() => {
      registrationStatusElm.innerText = webex.meetings.regisered ?
        'Registered' :
        'Not Registered';
    });
}

// Meetings Management Section --------------------------------------------------

const createMeetingDestinationElm = document.querySelector('#create-meeting-destination');
const createMeetingActionElm = document.querySelector('#create-meeting-action');
const meetingsJoinDeviceElm = document.querySelector('#meetings-join-device');
const meetingsJoinPinElm = document.querySelector('#meetings-join-pin');
const meetingsJoinModeratorElm = document.querySelector('#meetings-join-moderator');
const meetingsListCollectElm = document.querySelector('#meetings-list-collect');
const meetingsListElm = document.querySelector('#meetings-list');
const meetingsAddMediaElm = document.querySelector('#meetings-add-media');
const meetingsLeaveElm = document.querySelector('#meetings-leave');
const meetingsCurrentDetailsElm = document.querySelector('#meetings-current-details');

function generateMeetingsListItem(meeting) {
  const itemElm = document.createElement('div');
  const joinElm = document.createElement('button');
  const detailsElm = document.createElement('label');

  itemElm.id = `meeting-list-item-${meeting.id}`;
  itemElm.key = meeting.id;

  joinElm.onclick = () => joinMeeting(meeting.id);
  joinElm.type = 'button';
  joinElm.value = meeting.id;
  joinElm.innerText = 'meeting.join()';

  detailsElm.innerText = meeting.destination ||
    meeting.sipUri ||
    meeting.id;

  itemElm.appendChild(joinElm);
  itemElm.appendChild(detailsElm);

  return itemElm;
}

function collectMeetings() {
  console.log('MeetingsManagement#collectMeetings()');

  webex.meetings.syncMeetings()
    .then(() => new Promise((resolve) => {
      generalStartReceivingTranscription.disabled = false; // eslint-disable-line no-use-before-define
      setTimeout(() => resolve(), 200);
    }))
    .then(() => {
      console.log('MeetingsManagement#collectMeetings() :: successfully collected meetings');
      const meetings = webex.meetings.getAllMeetings();

      if (Object.keys(meetings).length === 0) {
        meetingsListElm.innerText = 'There are currently no meetings to display';

        return;
      }

      meetingsListElm.innerText = '';

      Object.keys(meetings).forEach(
        (key) => {
          meetingsListElm.appendChild(
            generateMeetingsListItem(meetings[key])
          );
        }
      );
    });
}

function createMeeting() {
  webex.meetings.create(createMeetingDestinationElm.value)
    .then((meeting) => {
      generalStartReceivingTranscription.disabled = false; // eslint-disable-line no-use-before-define

      if (meetingsListElm.childElementCount === 0) {
        meetingsListElm.innerText = '';
      }

      meetingsListElm.appendChild(
        generateMeetingsListItem(meeting)
      );
    });
}

function joinMeeting(meetingId) {
  const meeting = webex.meetings.getAllMeetings()[meetingId];

  if (!meeting) {
    throw new Error(`meeting ${meetingId} is invalid or no longer exists`);
  }

  const joinOptions = {
    pin: meetingsJoinPinElm.value,
    moderator: meetingsJoinModeratorElm.checked,
    moveToResource: false,
    resourceId: webex.devicemanager._pairedDevice ?
      webex.devicemanager._pairedDevice.identity.id :
      undefined,
    receiveTranscription: receiveTranscriptionOption
  };

  meeting.join(joinOptions)
    .then(() => {
      meetingsCurrentDetailsElm.innerText = meeting.destination ||
        meeting.sipUri ||
        meeting.id;

      meetingsLeaveElm.onclick = () => leaveMeeting(meeting.id);
    });
}

function leaveMeeting(meetingId) {
  if (!meetingId) {
    return;
  }

  const meeting = webex.meetings.getAllMeetings()[meetingId];

  if (!meeting) {
    throw new Error(`meeting ${meetingId} is invalid or no longer exists`);
  }

  meeting.leave()
    .then(() => {
      meetingsCurrentDetailsElm.innerText = 'Not currently in a meeting';
      // eslint-disable-next-line no-use-before-define
      cleanUpMedia(htmlMediaElements);
    });
}

// Meeting Controls Section --------------------------------------------------

const generalControlsForm = document.querySelector('#general-controls');
const generalControlsLockElm = document.querySelector('#gc-lock');
const generalControlsUnlockElm = document.querySelector('#gc-unlock');
const generalControlsLockStatus = document.querySelector('#gc-lock-status');
const generalControlsMeetingsList = document.querySelector('#gc-meetings-list');
const generalControlsRecStatus = document.querySelector('#gc-recording-status');
const generalControlsDtmfTones = document.querySelector('#gc-dtmf-tones');
const generalControlsDtmfStatus = document.querySelector('#gc-dtmf-status');
const generalStartReceivingTranscription = document.querySelector('#gc-start-receiving-transcription');
const generalStopReceivingTranscription = document.querySelector('#gc-stop-receiving-transcription');
const generalTranscriptionContent = document.querySelector('#gc-transcription-content');

const sourceDevicesGetMedia = document.querySelector('#sd-get-media-devices');
const sourceDevicesAudioInput = document.querySelector('#sd-audio-input-devices');
const sourceDevicesAudioOutput = document.querySelector('#sd-audio-output-devices');
const sourceDevicesVideoInput = document.querySelector('#sd-video-input-devices');
const sourceDeviceControls = document.querySelector('#source-devices-controls');
const receivingSourcesControls = document.querySelector('#receiving-sources-controls');
const audioInputDeviceStatus = document.querySelector('#sd-audio-input-device-status');
const audioOutputDeviceStatus = document.querySelector('#sd-audio-output-device-status');
const videoInputDeviceStatus = document.querySelector('#sd-video-input-device-status');

const meetingStreamsLocalVideo = document.querySelector('#local-video');
const meetingStreamsRemotelVideo = document.querySelector('#remote-video');
const meetingStreamsRemoteAudio = document.querySelector('#remote-audio');
const meetingStreamsLocalShare = document.querySelector('#local-screenshare');
const meetingStreamsRemoteShare = document.querySelector('#remote-screenshare');

const toggleSourcesMediaDirection = document.querySelectorAll('[name=ts-media-direction]');
const toggleSourcesSendAudioStatus = document.querySelector('#ts-toggle-audio-status');
const toggleSourcesSendVideoStatus = document.querySelector('#ts-toggle-video-status');
const toggleSourcesSendShareStatus = document.querySelector('#ts-screenshare-status');

const toggleSourcesQualityStatus = document.querySelector('#ts-sending-quality-status');
const toggleSourcesMeetingLevel = document.querySelector('#ts-sending-qualities-list');

let currentMediaStreams = [];

function getMediaSettings() {
  const settings = {};

  toggleSourcesMediaDirection.forEach((options) => {
    settings[options.value] = options.checked;

    if (options.sendShare && (isSafari || isiOS)) {
      // It's been observed that trying to setup a Screenshare at join along with the regular A/V streams
      // causes Safari to loose track of it's user gesture event due to getUserMedia & getDisplayMedia being called at the same time (through our internal setup)
      // It is recommended to join a meeting with A/V streams first and then call `meeting.shareScreen()` after joining the meeting successfully (on all browsers)
      settings[options.value] = false;
      console.warn('MeetingControsl#getMediaSettings() :: Please call `meeting.shareScreen()` after joining the meeting');
    }
  });

  return settings;
}


const htmlMediaElements = [
  meetingStreamsLocalVideo,
  meetingStreamsLocalShare,
  meetingStreamsRemotelVideo,
  meetingStreamsRemoteShare,
  meetingStreamsRemoteAudio
];


function cleanUpMedia(mediaElements) {
  mediaElements.forEach((elem) => {
    if (elem.srcObject) {
      elem.srcObject.getTracks().forEach((track) => track.stop());
      // eslint-disable-next-line no-param-reassign
      elem.srcObject = null;
    }
  });
}

/*
 * Fixes a safari related video playback issue where the autoplay
 * attribute does not play the video stream after the srcObject
 * has been previously set to null.
 *
 * The canplaythrough event is fired when the user agent can play the media,
 * and estimates that enough data has been loaded to play the media. When this
 * event is fired we then manually play the video if paused. This fixes the Safari
 * play issue above, allowing the video to play when new stream is added.
 */
function addPlayIfPausedEvents(mediaElements) {
  mediaElements.forEach((elem) => {
    elem.addEventListener('canplaythrough', (event) => {
      console.log('playVideoIfPaused#canplaythrough :: Play started', elem);
      if (elem.paused) elem.play();
    });
  });
}


function getNormalizedMeetingId(meeting) {
  return meeting.sipUri || meeting.id;
}


function getCurrentMeeting() {
  const meetings = webex.meetings.getAllMeetings();

  return meetings[Object.keys(meetings)[0]];
}


function lockMeeting() {
  const meeting = getCurrentMeeting();

  console.log('MeetingControls#lockMeeting()');
  if (meeting) {
    generalControlsLockStatus.innerText = 'Locking meeting...';
    meeting.lockMeeting()
      .then(() => {
        generalControlsLockStatus.innerText = 'Meeting locked!';
        console.log('MeetingControls#lockMeeting() :: successfully locked meeting');
      })
      .catch((error) => {
        generalControlsLockStatus.innerText = 'Error! See console for details.';
        console.log('MeetingControls#lockMeeting() :: unable to lock meeting');
        console.error(error);
      });
  }
  else {
    console.log('MeetingControls#lockMeeting() :: no valid meeting object!');
  }
}


function unlockMeeting() {
  const meeting = getCurrentMeeting();

  if (meeting) {
    console.log('MeetingControls#unlockMeeting()');
    generalControlsLockStatus.innerText = 'Unlocking meeting...';
    meeting.unlockMeeting()
      .then(() => {
        generalControlsLockStatus.innerText = 'Meeting unlocked!';
        console.log('MeetingControls#unlockMeeting() :: successfully unlocked meeting');
      })
      .catch((error) => {
        generalControlsLockStatus.innerText = 'Error! See console for details.';
        console.log('MeetingControls#unlockMeeting() :: unable to unlock meeting.');
        console.error(error);
      });
  }
  else {
    console.log('MeetingControls#unlockMeeting() :: no valid meeting object!');
  }
}

function startRecording() {
  const meeting = getCurrentMeeting();

  if (meeting) {
    console.log('MeetingControls#startRecording()');
    generalControlsRecStatus.innerText = 'Recording meeting...';
    meeting.startRecording()
      .then(() => {
        generalControlsRecStatus.innerText = 'Meeting is being recorded!';
        console.log('MeetingControls#startRecording() :: meeting recording started!');
      })
      .catch((error) => {
        generalControlsRecStatus.innerText = 'Error! See console for details.';
        console.log('MeetingControls#startRecording() :: unable to record meeting.');
        console.error(error);
      });
  }
  else {
    console.log('MeetingControls#startRecording() :: no valid meeting object!');
  }
}

function stopReceivingTranscription() {
  const meeting = getCurrentMeeting();

  generalStopReceivingTranscription.disabled = true;
  meeting.stopReceivingTranscription();
}

function startReceivingTranscription() {
  const meeting = getCurrentMeeting();

  if (meeting) {
    receiveTranscriptionOption = true;
    generalStartReceivingTranscription.innerHTML = 'Subscribed!';
    generalStartReceivingTranscription.disabled = true;
    generalStopReceivingTranscription.disabled = false;
    generalTranscriptionContent.innerHTML = '';

    meeting.on('meeting:receiveTranscription:started', (payload) => {
      generalTranscriptionContent.innerHTML += `\n${JSON.stringify(payload)}`;
    });

    meeting.on('meeting:receiveTranscription:stopped', () => {
      generalStartReceivingTranscription.innerHTML = 'start receiving transcription (click me before joining)';
      generalTranscriptionContent.innerHTML = 'Transcription Content: Webex Assistant must be enabled, check the console!';
    });
  }
  else {
    console.log('MeetingControls#startRecording() :: no valid meeting object!');
  }
}

function pauseRecording() {
  const meeting = getCurrentMeeting();

  if (meeting) {
    console.log('MeetingControls#pauseRecording()');
    generalControlsRecStatus.innerText = 'Pause recording...';
    meeting.pauseRecording()
      .then(() => {
        generalControlsRecStatus.innerText = 'Recording is paused!';
        console.log('MeetingControls#pauseRecording() :: meeting recording paused!');
      })
      .catch((error) => {
        generalControlsRecStatus.innerText = 'Error! See console for details.';
        console.log('MeetingControls#pauseRecording() :: unable to pause recording.');
        console.error(error);
      });
  }
  else {
    console.log('MeetingControls#pauseRecording() :: no valid meeting object!');
  }
}

function resumeRecording() {
  const meeting = getCurrentMeeting();

  if (meeting) {
    console.log('MeetingControls#resumeRecording()');
    generalControlsRecStatus.innerText = 'Resume recording...';
    meeting.resumeRecording()
      .then(() => {
        generalControlsRecStatus.innerText = 'Recording is resumed!';
        console.log('MeetingControls#resumeRecording() :: meeting recording resumed!');
      })
      .catch((error) => {
        generalControlsRecStatus.innerText = 'Error! See console for details.';
        console.log('MeetingControls#resumeRecording() :: unable to resume recording.');
        console.error(error);
      });
  }
  else {
    console.log('MeetingControls#resumeRecording() :: no valid meeting object!');
  }
}


function stopRecording() {
  const meeting = getCurrentMeeting();

  if (meeting) {
    console.log('MeetingControls#stopRecording()');
    generalControlsRecStatus.innerText = 'Stop recording meeting...';
    meeting.stopRecording()
      .then(() => {
        generalControlsRecStatus.innerText = 'Recording stopped successfully!';
        console.log('MeetingControls#stopRecording() :: meeting recording stopped!');
      })
      .catch((error) => {
        generalControlsRecStatus.innerText = 'Error! See console for details.';
        console.log('MeetingControls#stopRecording() :: unable to stop recording!');
        console.error(error);
      });
  }
  else {
    console.log('MeetingControls#stopRecording() :: no valid meeting object!');
  }
}


function sendDtmfTones() {
  const meeting = getCurrentMeeting();
  const tones = generalControlsDtmfTones.value || '';

  if (!tones) {
    console.log('MeetingControls#sendDtmfTones() :: Error, empty string.');
    generalControlsDtmfStatus.innerText = 'Please enter DTMF tones and try again.';

    return;
  }

  if (meeting) {
    console.log('MeetingControls#sendDtmfTones()');
    meeting.sendDTMF(tones)
      .then(() => {
        generalControlsDtmfStatus.innerText = 'DTMF tones sent successfully!';
        console.log('MeetingControls#sendDtmfTones() :: DTMF tones sent!');
      })
      .catch((error) => {
        generalControlsDtmfStatus.innerText = 'Error! See console for details.';
        console.log('MeetingControls#sendDtmfTones() :: unable to send DTMF tones!');
        console.error(error);
      });
  }
  else {
    console.log('MeetingControls#sendDtmfTones() :: no valid meeting object!');
  }
}


function getMediaStreams(mediaSettings = getMediaSettings(), audioVideoInputDevices = {}) {
  const meeting = getCurrentMeeting();

  console.log('MeetingControls#getMediaStreams()');

  if (!meeting) {
    console.log('MeetingControls#getMediaStreams() :: no valid meeting object!');

    return Promise.reject(new Error('No valid meeting object.'));
  }

  // Get local media streams
  return meeting.getMediaStreams(mediaSettings, audioVideoInputDevices)
    .then(([localStream, localShare]) => {
      console.log('MeetingControls#getMediaStreams() :: Successfully got following streams', localStream, localShare);
      // Keep track of current stream in order to addMedia later.
      const [currLocalStream, currLocalShare] = currentMediaStreams;

      /*
       * In the event of updating only a particular stream, other streams return as undefined.
       * We default back to previous stream in this case.
       */
      currentMediaStreams = [localStream || currLocalStream, localShare || currLocalShare];

      return currentMediaStreams;
    })
    .then(([localStream]) => {
      if (localStream && mediaSettings.sendVideo) {
        meetingStreamsLocalVideo.srcObject = localStream;
      }

      return {localStream};
    })
    .catch((error) => {
      console.log('MeetingControls#getMediaStreams() :: Error getting streams!');
      console.error();

      return Promise.reject(error);
    });
}


function populateSourceDevices(mediaDevice) {
  let select = null;
  const option = document.createElement('option');

  // eslint-disable-next-line default-case
  switch (mediaDevice.kind) {
    case 'audioinput':
      select = sourceDevicesAudioInput;
      break;
    case 'audiooutput':
      select = sourceDevicesAudioOutput;
      break;
    case 'videoinput':
      select = sourceDevicesVideoInput;
      break;
  }
  option.value = mediaDevice.deviceId;
  option.text = mediaDevice.label;
  select.appendChild(option);
}


function getMediaDevices() {
  const meeting = getCurrentMeeting();

  if (meeting) {
    console.log('MeetingControls#getMediaDevices()');
    meeting.getDevices()
      .then((devices) => {
        devices.forEach((device) => {
          populateSourceDevices(device);
        });
      });
  }
  else {
    console.log('MeetingControls#getMediaDevices() :: no valid meeting object!');
  }
}


const getOptionValue = (select) => {
  const selected = select.options[select.options.selectedIndex];

  return selected ? selected.value : undefined;
};


function getAudioVideoInput() {
  const deviceId = (id) => ({deviceId: {exact: id}});
  const audioInput = getOptionValue(sourceDevicesAudioInput) || 'default';
  const videoInput = getOptionValue(sourceDevicesVideoInput) || 'default';

  return {audio: deviceId(audioInput), video: deviceId(videoInput)};
}


function setVideoInputDevice() {
  const meeting = getCurrentMeeting();
  const {sendVideo, receiveVideo} = getMediaSettings();
  const {video} = getAudioVideoInput();

  if (meeting) {
    stopMediaTrack('video');
    getMediaStreams({sendVideo, receiveVideo}, {video})
      .then(({localStream}) => {
        meeting.updateVideo({
          sendVideo,
          receiveVideo,
          stream: localStream
        });
      })
      .catch((error) => {
        console.log('MeetingControls#setVideoInputDevice :: Unable to set video input device');
        console.error(error);
      });
  }
  else {
    console.log('MeetingControls#getMediaDevices() :: no valid meeting object!');
  }
}


function setAudioInputDevice() {
  const meeting = getCurrentMeeting();
  const {sendAudio, receiveAudio} = getMediaSettings();
  const {audio} = getAudioVideoInput();

  if (meeting) {
    stopMediaTrack('audio');
    getMediaStreams({sendAudio, receiveAudio}, {audio})
      .then(({localStream}) => {
        meeting.updateAudio({
          sendAudio,
          receiveAudio,
          stream: localStream
        });
      })
      .catch((error) => {
        console.log('MeetingControls#setAudioInputDevice :: Unable to set audio input device');
        console.error(error);
      });
  }
  else {
    console.log('MeetingControls#getMediaDevices() :: no valid meeting object!');
  }
}


function setAudioOutputDevice() {
  const audioOutputDevice = getOptionValue(sourceDevicesAudioOutput) || 'default';

  meetingStreamsRemoteAudio.setSinkId(audioOutputDevice)
    .then(() => {
      console.log(`MeetingControls#setAudioOutput() :: successfully set audio output to: ${audioOutputDevice}`);
    })
    .catch((error) => {
      console.log('MeetingControls#setAudioOutput() :: Error setting audio output!');
      console.error(error);
    });
}


function toggleSendAudio() {
  const meeting = getCurrentMeeting();

  const handleError = (error) => {
    toggleSourcesSendAudioStatus.innerText = 'Error! See console for details.';
    console.log('MeetingControls#toggleSendAudio() :: Error toggling audio!');
    console.error(error);
  };

  console.log('MeetingControls#toggleSendAudio()');
  if (!meeting) {
    console.log('MeetingControls#toggleSendAudio() :: no valid meeting object!');

    return;
  }

  if (meeting.isAudioMuted()) {
    meeting.unmuteAudio()
      .then(() => {
        toggleSourcesSendAudioStatus.innerText = 'Toggled audio on!';
        console.log('MeetingControls#toggleSendAudio() :: Successfully unmuted audio!');
      })
      .catch(handleError);
  }
  else {
    meeting.muteAudio()
      .then(() => {
        toggleSourcesSendAudioStatus.innerText = 'Toggled audio off!';
        console.log('MeetingControls#toggleSendAudio() :: Successfully muted audio!');
      })
      .catch(handleError);
  }
}


function toggleSendVideo() {
  const meeting = getCurrentMeeting();

  const handleError = (error) => {
    toggleSourcesSendVideoStatus.innerText = 'Error! See console for details.';
    console.log('MeetingControls#toggleSendVideo() :: Error toggling video!');
    console.error(error);
  };

  console.log('MeetingControls#toggleSendVideo()');
  if (!meeting) {
    console.log('MeetingControls#toggleSendVideo() :: no valid meeting object!');

    return;
  }

  if (meeting.isVideoMuted()) {
    meeting.unmuteVideo()
      .then(() => {
        toggleSourcesSendVideoStatus.innerText = 'Toggled video on!';
        console.log('MeetingControls#toggleSendVideo() :: Successfully unmuted video!');
      })
      .catch(handleError);
  }
  else {
    meeting.muteVideo()
      .then(() => {
        toggleSourcesSendVideoStatus.innerText = 'Toggled video off!';
        console.log('MeetingControls#toggleSendVideo() :: Successfully muted video!');
      })
      .catch(handleError);
  }
}


async function startScreenShare() {
  const meeting = getCurrentMeeting();

  // Using async/await to make code more readable
  console.log('MeetingControls#startScreenShare()');
  try {
    await meeting.shareScreen();
    toggleSourcesSendShareStatus.innerText = 'Screen share on!';
    console.log('MeetingControls#startScreenShare() :: Successfully started sharing!');
  }
  catch (error) {
    toggleSourcesSendShareStatus.innerText = 'Error! See console for details.';
    console.log('MeetingControls#startScreenShare() :: Error starting screen share!');
    console.error(error);
  }
}


async function stopScreenShare() {
  const meeting = getCurrentMeeting();

  console.log('MeetingControls#stopScreenShare()');
  try {
    await meeting.stopShare();
    toggleSourcesSendShareStatus.innerText = 'Screen share off!';
    console.log('MeetingControls#stopScreenShare() :: Successfully stopped sharing!');
  }
  catch (error) {
    toggleSourcesSendShareStatus.innerText = 'Error! See console for details.';
    console.log('MeetingControls#stopScreenShare() :: Error stopping screen share!');
    console.error(error);
  }
}


function setLocalMeetingQuality() {
  const meeting = getCurrentMeeting();
  const level = getOptionValue(toggleSourcesMeetingLevel);

  meeting.setLocalVideoQuality(level)
    .then(() => {
      toggleSourcesQualityStatus.innerText = `Local meeting quality level set to ${level}!`;
      console.log('MeetingControls#setLocalMeetingQuality() :: Meeting quality level set successfully!');
    })
    .catch((error) => {
      toggleSourcesQualityStatus.innerText = 'MeetingControls#setLocalMeetingQuality() :: Error setting quality level!';
      console.log('MeetingControls#setLocalMeetingQuality() :: Error meeting quality!');
      console.error(error);
    });
}


function setRemoteMeetingQuality() {
  const meeting = getCurrentMeeting();
  const level = getOptionValue(toggleSourcesMeetingLevel);

  meeting.setRemoteQualityLevel(level)
    .then(() => {
      toggleSourcesQualityStatus.innerText = `Remote meeting quality level set to ${level}!`;
      console.log('MeetingControls#setRemoteMeetingQuality :: Meeting quality level set successfully!');
    })
    .catch((error) => {
      toggleSourcesQualityStatus.innerText = 'MeetingControls#setRemoteMeetingQuality :: Error setting quality level!';
      console.log('MeetingControls#setRemoteMeetingQuality :: Error meeting quality!');
      console.error(error);
    });
}


function setMeetingQuality() {
  const meeting = getCurrentMeeting();
  const level = getOptionValue(toggleSourcesMeetingLevel);

  meeting.setMeetingQuality(level)
    .then(() => {
      toggleSourcesQualityStatus.innerText = `Meeting quality level set to ${level}!`;
      console.log('MeetingControls#setMeetingQuality :: Meeting quality level set successfully!');
    })
    .catch((error) => {
      toggleSourcesQualityStatus.innerText = 'MeetingControls#setMeetingQuality() :: Error setting quality level!';
      console.log('MeetingControls#setMeetingQuality :: Error meeting quality!');
      console.error(error);
    });
}


function stopMediaTrack(type) {
  const meeting = getCurrentMeeting();

  if (!meeting) return;
  const {audioTrack, videoTrack, shareTrack} = meeting.mediaProperties;

  // eslint-disable-next-line default-case
  switch (type) {
    case 'audio':
      audioTrack.stop();
      break;
    case 'video':
      videoTrack.stop();
      break;
    case 'share':
      shareTrack.stop();
      break;
  }
}


function clearMediaDeviceList() {
  sourceDevicesAudioInput.innerText = '';
  sourceDevicesAudioOutput.innerText = '';
  sourceDevicesVideoInput.innerText = '';
}


// Meeting Streams --------------------------------------------------

function addMedia() {
  const meeting = getCurrentMeeting();
  const [localStream, localShare] = currentMediaStreams;

  console.log('MeetingStreams#addMedia()');

  if (!meeting) {
    console.log('MeetingStreams#addMedia() :: no valid meeting object!');
  }

  meeting.addMedia({
    localShare,
    localStream,
    mediaSettings: getMediaSettings()
  }).then(() => {
    console.log('MeetingStreams#addMedia() :: successfully added media!');
  }).catch((error) => {
    console.log('MeetingStreams#addMedia() :: Error adding media!');
    console.error(error);
  });

  // Wait for media in order to show video/share
  meeting.on('media:ready', (media) => {
    // eslint-disable-next-line default-case
    switch (media.type) {
      case 'remoteVideo':
        meetingStreamsRemotelVideo.srcObject = media.stream;
        break;
      case 'remoteAudio':
        meetingStreamsRemoteAudio.srcObject = media.stream;
        break;
      case 'remoteShare':
        meetingStreamsRemoteShare.srcObject = media.stream;
        break;
      case 'localShare':
        meetingStreamsLocalShare.srcObject = media.stream;
        break;
    }
  });
}


let currentDevice;

const devicesListItemsElm = document.querySelector('#devices-list-items');
const currentDevicePairState = document.querySelector('#device-pair-state');
const currentDeviceDetailsElm = document.querySelector('#current-device-details');
const currentDeviceAudioStateElm = document.querySelector('#current-device-audio-state');
const currentDevicePinQueryElm = document.querySelector('#device-pin-query');
const findDevicesQueryElm = document.querySelector('#find-devices-query');
const findDevicesStatusElm = document.querySelector('#find-devices-status');
const findDevicesListElm = document.querySelector('#find-devices-list');
const pmrIdElm = document.querySelector('#pmr-id');
const pmrPinElm = document.querySelector('#pmr-pin');
const pmrDetailsElm = document.querySelector('#pmr-details');

function selectDevice(device) {
  console.log('MeetingsDevices#selectDevice()');

  currentDevice = device;

  currentDeviceDetailsElm.innerText = JSON.stringify(device, null, 2);
  currentDeviceAudioStateElm.innerText = 'Device audio state has not been queried yet';
}

function deviceRequestUnpair() {
  console.log('MeetingsDevices#deviceRequestUnpair()');

  currentDevicePairState.innerText = 'Unpairing...';

  webex.devicemanager.unpair()
    .then(() => {
      currentDevicePairState.innerText = 'Not Paired';
    })
    .catch((error) => {
      currentDevicePairState.innerText = `Paired to ${currentDevice.deviceInfo.description} [${currentDevice.id}]`;

      throw error;
    });
}

function deviceRequestPair() {
  console.log('MeetingsDevices#deviceRequestPair()');

  currentDevicePairState.innerText = 'Pairing...';

  webex.devicemanager.pair({
    pin: currentDevicePinQueryElm.value
  })
    .then(() => {
      currentDevicePairState.innerText = `Paired to ${currentDevice.deviceInfo.description} [${currentDevice.id}]`;
    })
    .catch((error) => {
      currentDevicePairState.innerText = error.message;

      throw error;
    });
}

function generateMeetingsDevicesListItem(device) {
  const itemElm = document.createElement('div');
  const selectElm = document.createElement('button');
  const removeElm = document.createElement('button');
  const detailsElm = document.createElement('label');

  itemElm.id = `meeting-list-item-${device.id}`;
  itemElm.key = device.id;

  selectElm.onclick = () => selectDevice(device);
  selectElm.type = 'button';
  selectElm.value = device.id;
  selectElm.innerText = 'Select';

  removeElm.onclick = () => webex.devicemanager.remove(device.id);
  removeElm.type = 'button';
  removeElm.value = device.id;
  removeElm.innerText = 'webex.devicemanager.remove()';

  detailsElm.innerText = `${device.deviceInfo.description} [${device.id}]`;

  itemElm.appendChild(selectElm);
  itemElm.appendChild(removeElm);
  itemElm.appendChild(detailsElm);

  return itemElm;
}

function generateMeetingsDevicesSearchItem(device) {
  const itemElm = document.createElement('div');
  const selectElm = document.createElement('button');
  const detailsElm = document.createElement('label');

  console.log('device', device);

  itemElm.setAttribute('id', `meeting-list-item-${device.id}`);
  itemElm.setAttribute('key', device.id);

  selectElm.onclick = () => selectDevice(device);
  selectElm.setAttribute('type', 'button');
  selectElm.setAttribute('value', device.id);
  selectElm.innerText = 'Select';

  detailsElm.innerText = `${device.description || device.name} [${device.id}]`;

  itemElm.appendChild(selectElm);
  itemElm.appendChild(detailsElm);

  return itemElm;
}

function deviceGetAudioState() {
  console.log('MeetingsDevices#refreshDevicesList()');

  webex.devicemanager.getAudioState()
    .then((state) => {
      currentDeviceAudioStateElm.innerText = JSON.stringify(state, null, 2);
    });
}

function refreshDevicesList() {
  console.log('MeetingsDevices#refreshDevicesList()');

  devicesListItemsElm.innerText = '';

  webex.devicemanager.refresh()
    .then((devices) => {
      if (devices.length === 0) {
        devicesListItemsElm.innerText =
          'There are currently no meetings devices to display';

        return;
      }

      devices.forEach(
        (device) => devicesListItemsElm.appendChild(
          generateMeetingsDevicesListItem(device)
        )
      );
    });
}

function searchForDevices() {
  console.log('DevicesControls#searchForDevices()');
  findDevicesStatusElm.innerText = 'Searching...';
  findDevicesListElm.innerText = '';

  const searchQuery = findDevicesQueryElm.value;

  if (searchQuery && searchQuery.length < 3) {
    const msg = 'device query must contain 3 characters or more';

    findDevicesStatusElm.innerText = msg;

    throw new Error(msg);
  }

  webex.devicemanager.search({searchQuery})
    .then((results) => {
      results.forEach(
        (device) => findDevicesListElm.appendChild(
          generateMeetingsDevicesSearchItem(device)
        )
      );

      findDevicesStatusElm.innerText = '';
    })
    .catch((error) => {
      findDevicesQueryElm.innerText = error.message;
    });
}

function changeAudioState(command) {
  webex.devicemanager[command]()
    .then((res) => {
      console.log(res);
      // currentDeviceAudioStateElm.innerText = JSON.stringify(audio, null, 2);
    });
}

function claimPersonalMeetingRoom() {
  console.log('DevicesControls#claimPersonalMeetingRoom()');

  pmrDetailsElm.innerText = 'Attempting to claim';

  const pmrId = pmrIdElm.value;
  const pmrPin = pmrPinElm.value;

  if (!pmrId || !pmrPin) {
    const msg = 'a pmr id and pmr pin must be provided';

    pmrDetailsElm.innerText = msg;

    throw new Error(msg);
  }

  webex.meetings.personalMeetingRoom.claim(pmrId, pmrPin)
    .then((pmr) => {
      console.log('pmr claimed', pmr);

      pmrDetailsElm.innerText = JSON.stringify(
        webex.meetings.personalMeetingRoom, null, 2
      );
    })
    .catch((error) => {
      pmrDetailsElm.innerText = error.message;
    });
}
// The terms Members and Particpants are used interchangeably
// Particpants Section
const particpantsList = document.querySelector('.particpantList');

function generateAddedMembers(id, name, statuObj) {
  function createButton(text, attr, func, value) {
    const button = document.createElement('button');

    button.onclick = (e) => func(e.target);
    button.innerText = text;
    button.setAttribute('data-id', attr);
    button.setAttribute('type', 'button');
    button.value = value;

    return button;
  }

  function createLabel(attr, value, string) {
    const label = document.createElement('label');

    label.innerText = string + value;
    label.setAttribute('data-id', attr);

    return label;
  }

  const buttons = [
    createButton('meeting.admit()', 'participant-a-admit', admitMember, id),
    createButton('meeting.remove()', 'participant-a-remove', removeMember, id),
    createButton('meeting.mute()', 'participant-a-mute', muteMember, id),
    createButton('meeting.transfer()',
      'participant-a-transfer-ownership',
      transferHostToMember,
      id)
  ];

  const labels = [
    createLabel('participant-a-id', id, 'id: '),
    createLabel('participant-a-status', statuObj, 'state: '),
    createLabel('participant-a-name', name, 'name: ')
  ];

  const combined = buttons.concat(labels);
  const docFrag = document.createDocumentFragment();
  const container = document.createElement('div');

  combined.forEach((ele) => {
    docFrag.appendChild(ele);
  });
  container.appendChild(docFrag);
  particpantsList.appendChild(container);
}

function inviteMember(addButton) {
  const meeting = getCurrentMeeting();
  const emailVal = addButton.previousElementSibling.value.trim();

  if (meeting) {
    meeting.invite({emailAddress: emailVal}).then((res) => {
      console.log(res.body.locus);
      const particpantsArr = res.body.locus.participants;
      let mostRecentParticipantId;
      let mostRecentParticpantName;
      let mostRecentParticpantStatusObj;

      particpantsArr.forEach((obj) => {
        if (obj.person.email === emailVal ||
          obj.person.primaryDisplayString === emailVal) {
          mostRecentParticipantId = obj.id;
          mostRecentParticpantName = obj.person.name ||
          obj.person.primaryDisplayString;
          mostRecentParticpantStatusObj = obj.state;
        }
      });
      generateAddedMembers(mostRecentParticipantId,
        mostRecentParticpantName,
        mostRecentParticpantStatusObj);
    }).catch((err) => {
      console.log('unable to invite participant', err);
    });
  }
}

function admitMember(admitButton) {
  const meeting = getCurrentMeeting();
  const particpantID = admitButton.value;

  if (meeting) {
    meeting.admit([particpantID]).then((res) => {
      console.log(res, 'participant has been admitted');
    }).catch((err) => {
      console.log('unable to admit participant', err);
    });
  }
}

function removeMember(removeButton) {
  const meeting = getCurrentMeeting();

  const particpantID = removeButton.value;

  if (meeting) {
    meeting.remove(particpantID).then((res) => {
      console.log(res, 'participant has been removed');
    }).catch((err) => {
      console.log('unable to remove participant', err);
    });
  }
}

function muteMember(muteButton) {
  const meeting = getCurrentMeeting();
  const unmute = muteButton.getAttribute('data-unmute');
  const mute = unmute !== 'true';

  const particpantID = muteButton.value;

  if (meeting) {
    meeting.mute(particpantID, mute).then((res) => {
      console.log(res, `participant is ${mute ? 'mute' : 'unmute'}`);
      if (mute) {
        muteButton.setAttribute('data-unmute', 'true');
      }
      else {
        muteButton.removeAttribute('data-unmute');
      }
    }).catch((err) => {
      console.log('error', err);
    });
  }
}

function transferHostToMember(transferButton) {
  const meeting = getCurrentMeeting();
  const particpantID = transferButton.value;

  if (meeting) {
    meeting.transfer(particpantID).then((res) => {
      console.log(res, `succesful tranfer to ${particpantID}`);
    }).catch((err) => {
      console.log('error', err);
    });
  }
}

function viewParticipants() {
  const meeting = getCurrentMeeting();

  particpantsList.innerText = '';

  if (meeting) {
    const {members} = meeting.members.membersCollection;

    Object.entries(members).forEach(([key, value]) => {
      generateAddedMembers(value.id,
        value.participant.person.name ||
        value.participant.person.primaryDisplayString,
        value.participant.state);
    });
  }
}

/* ANSWER/REJECT INCOMING CALL */

function toggleDisplay(elementId, status) {
  const element = document.getElementById(elementId);

  if (status) {
    element.style.visibility = 'visible';
  }
  else {
    element.style.visibility = 'hidden';
  }
}

function answerMeeting() {
  const meeting = getCurrentMeeting();

  if (meeting) {
    meeting.join().then(() => {
      meeting.acknowledge('ANSWER', false);
    });
    toggleDisplay('incomingsection', false);
  }
}

function rejectMeeting() {
  const meeting = getCurrentMeeting();

  if (meeting) {
    meeting.decline('BUSY');
    toggleDisplay('incomingsection', false);
  }
}

// Separate logic for Safari enables video playback after previously
// setting the srcObject to null regardless if autoplay is set.
window.onload = () => addPlayIfPausedEvents(htmlMediaElements);