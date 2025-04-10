/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
import { downloadUseA } from "../utils/file.js";
import { curry, Either, identity, pipe, seq, Task, then } from "../utils/functional-utils.js";

const AUDIO_MIME = {
    WEBM_OPUS:          'audio/webm;codecs="opus"',
    OGG_OPUS:           'audio/ogg;codecs="opus"',
    OGG_VORBIS:         'audio/ogg;codecs="vorbis"',
}

const REPORT_TYPE = {
    CANDIDATE_TYPE:     'candidate-pair',
    INBOUND_RTP:        'inbound-rtp',
}

const getUserMedia = (constraints) => Task(
    (reject, resolve) => 
        navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
            resolve(stream);
        }).catch((err) => {
            reject(err);
        })
    )
const getLocalDescription = (pc) => Task(
    (reject, resolve) =>
        pc.createOffer()
        .then((offer) => {
            resolve(offer);
        }).catch((err) => {
            reject(err);
        })
)
const setLocalDescription = (pc, offer) => Task(
    (reject, resolve) => 
        (pc.setLocalDescription(offer), resolve({pc, offer}))
)

export function createMedia(constraints) {
    const { audio, video } = constraints;
    const pc = new RTCPeerConnection();
    audio && pc.addTransceiver('audio', {direction: 'sendrecv'});
    video && pc.addTransceiver('video', {direction: 'sendrecv'});
    const media = getUserMedia({ audio, video })
    .map(stream => 
        stream
        .getTracks()
        .map(track => pc.addTrack(track, stream))
    )
    .chain(() => getLocalDescription(pc))
    .chain(offer => setLocalDescription(pc, offer));
    return media;
}

export function createAudioMedia() {
    const pc = new RTCPeerConnection();
    pc.addTransceiver('audio', {direction: 'sendrecv'});
    const media = getUserMedia({ audio: true, video: false })
    .map(stream => 
        stream.getAudioTracks().map(track => {
            pc.addTrack(track, stream)
        })
    )
    .chain(() => getLocalDescription(pc))
    .chain(offer => setLocalDescription(pc, offer));
    return media;
}

export function createSendMedia(constraints) {
    const { audio, video } = constraints;
    const pc = new RTCPeerConnection();
    audio && pc.addTransceiver('audio', {direction: 'sendonly'});
    video && pc.addTransceiver('video', {direction: 'sendonly'});
    const media = getUserMedia({ audio, video })
    .map(stream => 
        stream
        .getTracks()
        .map(track => pc.addTrack(track, stream))
    )
    .chain(() => getLocalDescription(pc))
    .chain(offer => setLocalDescription(pc, offer));
    return media;
}

export function createReceiveMedia(constraints) {
    const { audio, video } = constraints;
    const pc = new RTCPeerConnection();
    audio && pc.addTransceiver('audio', {direction: 'recvonly'});
    video && pc.addTransceiver('video', {direction: 'recvonly'});
    return getLocalDescription(pc)
    .chain(offer => setLocalDescription(pc, offer))
}

export function setMediaRemoteDescription(answer, pc) {
    const rtcDesc = new RTCSessionDescription({type: 'answer', sdp: answer});
    pc && pc.setRemoteDescription(rtcDesc);
}

export function setSendMediaCallback() {
    
}

export function setMediaOnTrack(pc, ontrack = identity) {
    setMediaCallback(pc, { ontrack });
}
/**
 ** icecandidate事件 当 RTCPeerConnection 通过 RTCPeerConnection.setLocalDescription() (en-US) 方法更改本地描述之后，
 * 该 RTCPeerConnection 会抛出 icecandidate 事件。该事件的监听器需要将更改后的描述信息传送给远端 RTCPeerConnection，以更新远端的备选源。 
 * 触发 icecandidate 事件的首要原因：当获得新的源之后，需要将该源的信息发送给远端信号服务器，并分发至其他端的 RTCPeerConnection。
 * 其他 RTCPeerConnection 通过 addIceCandidate() 方法将新 candidate 中携带的信息，将新的源描述信息添加进它的备选池中
 ** icegatheringstatechange事件 检测本地ice状态，有3个状态 
 * new 刚创建，还没网络信息
 * gathering 正在获取本地candidates
 * complete 已经完成所有candidates获取
 ** iceconnectionstatechange事件 获取远端ice状态，有7个状态
 * new 正在获取本地candidates，也在等待对端的- candidates
 * checking 正在尝试连接，起码收到一个对端的candidate，但同时可能还在获取candidates中
 * connected 已经找到一个连接是有效的，但还在尝试其他的。
 * completed 已经确定一个将用来使用的连接。
 * failed 所有candidate都尝试过都失败
 * disconnected 间歇性发生，可能会内部解决。一段时间连接不上会转化为failed
 * closed 表示 ICE agent关闭
 * 检测到iceConnectionState == 'failed’时，重置peerConnection,创建一个offer发送给对方
 */
function setMediaCallback(pc, {
    onconnectionstatechange     = identity,
    ondatachannel               = identity,
    onicecandidate              = identity,
    onicecandidateerror         = identity,
    oniceconnectionstatechange  = identity,
    onicegatheringstatechange   = identity,
    onnegotiationneeded         = identity,
    onsignalingstatechange      = identity,
    ontrack                     = identity,
} = {}) {
    pc.onconnectionstatechange    = onconnectionstatechange;
    pc.ondatachannel              = ondatachannel;
    pc.onicecandidate             = onicecandidate;
    pc.onicecandidateerror        = onicecandidateerror;
    pc.oniceconnectionstatechange = oniceconnectionstatechange;
    pc.onicegatheringstatechange  = onicegatheringstatechange;
    pc.onnegotiationneeded        = onnegotiationneeded;
    pc.onsignalingstatechange     = onsignalingstatechange;
    pc.ontrack                    = ontrack;
}

export function closePeerConnection(pc) {
    console.log('media service close peer connection: ', pc);
    then(
        !!pc,
        seq(
            stopLocalStreamTracks,
            pc => pc.close()
        )
    )(pc);
    pc = null;
}

function stopLocalStreamTracks(pc) {
    Either.of(pc)
    .map(pc      => pc.getLocalStreams())
    .map(streams => streams.map(stream => stream.getTracks()).flat())
    .map(tracks  => tracks.forEach(track => track.stop()));
}

/**
 ** 创建录音
 */
export function audioMediaRecord(fileName, pc) {
    const options = getAudioOptions();
    Either.of(pc)
    .map(pc => pc.getRemoteStreams())
    .map(streams => streams[0])
    .map(stream => createMediaRecorder(stream, options))
    .map(mediaRecorder => setAudioRecorderCb(fileName, mediaRecorder))
    .unwrap();
}

function createMediaRecorder(stream, options) {
    const mediaRecorder = new MediaRecorder(stream, options);
    return mediaRecorder;
}

function getAudioOptions() {
    return {
        mimeType: getSupportedAudioMIME(),
    }
}

function getSupportedAudioMIME() {
    return MediaRecorder.isTypeSupported(AUDIO_MIME.WEBM_OPUS) ?
            AUDIO_MIME.WEBM_OPUS:
            MediaRecorder.isTypeSupported(AUDIO_MIME.OGG_OPUS) ?
            AUDIO_MIME.OGG_OPUS:
            MediaRecorder.isTypeSupported(AUDIO_MIME.OGG_VORBIS) ?
            AUDIO_MIME.OGG_VORBIS:
            null;
}

function setAudioRecorderCb(fileName, mediaRecorder) {
    const chunks = [];
    mediaRecorder.ondataavailable = function (event) {
        chunks.push(event.data);
    }
    mediaRecorder.onerror = function (err) {
        console.error('media service media recorder error:', err);
    }
    mediaRecorder.onstop = function () {
        console.error('media service media recorder stop');
        const downloadFile = curry(downloadUseA)(fileName);
        pipe(
            createUrlObj,
            downloadFile
        )(chunks);
    }
    return mediaRecorder;
}

export function startRecord(mediaRecorder) {
    mediaRecorder && mediaRecorder.start();
    return mediaRecorder;
}

export function stopRecord(mediaRecorder) {
    mediaRecorder && mediaRecorder.stop();
}

function createUrlObj(chunks) {
    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    const urlObj = URL.createObjectURL(blob);
    return urlObj;
}
/**
 ** 获取视频流的统计信息 
 */
export function getVideoStatsInfo(pc) {
    Either.of(pc)
    .map(pc => pc.getRemoteStreams())
    .map(streams => streams[0])
    .map(stream => stream.getVideoTracks())
    .map(videoTracks => videoTracks[0])
    .map(videoTrack => getStats(pc, videoTrack))
    .unwrap();
}

async function getStats(pc, videoTrack) {
    const stats = await pc.getStats(videoTrack);
    let bitRate         = 0;
    let framesPerSecond = 0;
    let packetsLost     = 0;
    let packetsReceived = 0;
    let width           = 0;
    let height          = 0;
    stats.forEach(report => {
        const { 
            type, 
            availableIncomingBitrate, 
            frameWidth, 
            frameHeight, 
            framesPerSecond: fps, 
            packetsLost: lost, 
            packetsReceived: total 
        } = report;
        [REPORT_TYPE.CANDIDATE_TYPE].includes(type) && (bitRate = nonnegative(availableIncomingBitrate));
        [REPORT_TYPE.INBOUND_RTP].includes(type) && (
            width = nonnegative(frameWidth),
            height = nonnegative(frameHeight),
            framesPerSecond =  nonnegative(fps),
            packetsLost = nonnegative(lost),
            packetsReceived = nonnegative(total)
        );
    });
    return {
        bitRate,
        framesPerSecond,
        packetsLost,
        packetsReceived,
        width,
        height
    }
}

function nonnegative(num) {
    return num ? num > 0 ? num : 0 : 0;
}

export function muteAllStream(pc, enabled = false) {
    Either.of(pc)
    .map(pc      => pc.getLocalStreams())
    .map(streams => streams.map(stream => stream.getTracks()).flat())
    .map(tracks  => tracks.forEach(track => track.enabled = enabled));
}

// export function muteAudioStream(pc, enabled = false) {
//     console.log('media service mute audio stream:', pc, enabled);
//     Either.of(pc)
//     .map(pc      => pc.getLocalStreams())
//     .map(streams => streams.map(stream => stream.getAudioTracks()).flat())
//     .map(tracks  => tracks.forEach(track => {track.enabled = enabled; console.log('media service mute audio track: ', track);}));
// }

export function muteAudioStream(pc, enabled = false) {
    let oldTrack = null;
    
    console.log('media service mute audio stream:', pc, enabled);
    Either.of(pc)
    .map(pc => {
        // 处理本地音频轨道的启用/禁用
        const tracks = pc.getLocalStreams()
            .flatMap(stream => stream.getAudioTracks());
        tracks.forEach(track => {
            track.enabled = enabled;
            console.log('media service mute audio track: ', track);
        });
        return pc; // 返回pc以供后续步骤使用
    })
    .map(pc => {
        // 根据条件处理发送端轨道替换
        if (!enabled) {
            const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
            console.log('media service mute audio sender: ', sender);
            if (sender) {
                oldTrack = sender.track;
                sender.replaceTrack(null);
                console.log('停止音频发送端:', sender);
            }
        } else {
            const sender = pc.getSenders().find(s => s.track === null);
            console.log('media service mute audio sender: ', sender + "oldTrack =" + oldTrack);
            if (sender && oldTrack && oldTrack.readyState === 'live') {
                console.log('开始音频发送端:', sender);
                sender.replaceTrack(oldTrack);
            }
        }
    });
}


export function muteVideoStream(pc, enabled = false) {
    Either.of(pc)
    .map(pc      => pc.getLocalStreams())
    .map(streams => streams.map(stream => stream.getVideoTracks()).flat())
    .map(tracks  => tracks.forEach(track => track.enabled = enabled));
}
/**
** 获取音频的时域信息 
*/
function getAudioTimeDomainData(stream) {
    const audioContext = new AudioContext();
    const audioSource  = audioContext.createMediaStreamSource(stream);
    const     analyser = audioContext.createAnalyser(); analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const    dataArray = new Uint8Array(bufferLength);
    audioSource.connect(analyser);
    analyser.getByteTimeDomainData(dataArray);
    return dataArray;
}
function getAudioFrequencyDomainData(stream) {
    const audioContext = new AudioContext();
    const audioSource  = audioContext.createMediaStreamSource(stream);
    const     analyser = audioContext.createAnalyser(); analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const    dataArray = new Uint8Array(bufferLength);
    audioSource.connect(analyser);
    analyser.getByteFrequencyData(dataArray);
    return dataArray;
}
/**
** 均方根 
*/
function getRootMeanSquare(dataArray) {
    let rms = dataArray.map(value => Math.pow((value/128 - 1), 2)).reduce((pre, cur) => pre + cur);
    rms = Math.sqrt(rms / dataArray.byteLength);
    return rms;
}

/**
 ** 获取音频强度 
*/
export function getAudioIntensity(stream) {
    return pipe(
        getAudioTimeDomainData,
        getRootMeanSquare,
        rms => Math.max(0, Math.min(1, rms))
    )(stream);
}