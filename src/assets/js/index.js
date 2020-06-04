const getParams = function (url) {
    var params = {};
    var parser = document.createElement('a');
    parser.href = url;
    var query = parser.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        params[pair[0]] = decodeURIComponent(pair[1]);
    }
    return params;
};

const socket = io('http://localhost:5000/')

const maxError = 0.5;
const eventTimeDiff = 1
const interval = 1000;
var disableEventListener = false;
var onlyHost = false;

var userId = "";
var roomId = getParams(location.href).roomId
var trackId = "";

var audio = document.getElementById('audiosrc');
var lastState = {}
var lastRecievedAt = 0;


setInterval(() => {        
    if(audio.readyState != 4 || lastState === {})
        return;
    if (lastState.is_playing)
        audio.play()
    else
        audio.pause()
    var expectedPosition = (lastState.is_playing) ? (new Date().getTime()) / 1000 - lastState.last_updated + lastState.position : lastState.position
    if(Math.abs(audio.currentTime - expectedPosition) >= maxError){
        console.log("Syncing now...")
        disableEventListener = true
        audio.currentTime = expectedPosition;
        setTimeout(() => {
            disableEventListener = false
        }, interval);
        
    }else{
        console.log("The sync offset is less than 1sec")
    }
}, interval);

const setPlaybackTime = (data) =>{
    lastRecievedAt = (new Date().getTime()) / 1000
    audio.currentTime = data.position + lastRecievedAt - data.last_updated;
}


socket.emit('joinRoom',{roomId: roomId})
socket.on('joinRoom',(data)=>{
    console.log("Present state is: ");
    console.log(data);
    lastState = data.state;
    onlyHost = data.onlyHost;
})

socket.on('userId', (data) => {
    console.log(data);
    userId = data.userId;
})

socket.on('trackId',(data)=>{
    console.log(data);
    trackId = data.trackId;
    audio.src = "http://localhost:5000/api/listen/" + trackId;
})

socket.on('sendMessage', (msg) => {
    console.log("Recieved a message from the server");
    console.log(msg);
})

socket.on('pause',(data)=>{
    disableEventListener = true    

    console.log("Pausing playback")
    audio.currentTime = data.position
    audio.pause();
    lastState = data;
    setTimeout(() => {
        disableEventListener = false
    }, interval);
})

socket.on('play',(data)=>{
    disableEventListener = true
    
    console.log("playing audio")
    setPlaybackTime(data);
    audio.play()
    lastState = data;

    setTimeout(() => {
        disableEventListener = false
    }, interval);
})

socket.on('seek',(data)=>{
    
    disableEventListener = true
    console.log("Seeking audio buffer")
    setPlaybackTime(data)
    console.log("Is playing: "+data.is_playing)
    lastState = data;
    console.log("Seek data recieved")
    console.log(data)

    setTimeout(() => {
        disableEventListener = false
    }, interval);
})


audio.addEventListener('play',(event) =>{
    if(disableEventListener || onlyHost) return
    console.log("Play event detected")
    lastState.last_updated = (new Date().getTime()) / 1000;
    lastState.position = audio.currentTime
    lastState.is_playing = true
    socket.emit('play',lastState)
})
audio.addEventListener('pause',(event) =>{
    if (disableEventListener || onlyHost) return
    console.log("Pause event detected")
    // lastState.last_updated = (new Date().getTime()) / 1000;
    lastState.position = audio.currentTime
    lastState.is_playing = false
    socket.emit('pause',lastState)
})
audio.addEventListener('seeked',(event) =>{
    if (disableEventListener || !audio.paused || onlyHost) return
    console.log("audio.paused is :"+ audio.paused)
    console.log("Seek event detected")
    lastState.last_updated = (new Date().getTime()) / 1000;
    lastState.position = audio.currentTime
    console.log(lastState)
    socket.emit('seek',lastState)
})
