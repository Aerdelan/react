/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/

import { identity, pipe } from "../utils/functional-utils";

const { 
    addListener,
    create,
    ErrorCode,
    init,
    join,
    preview,
    publish,
    unpublish,
    subscribe,
    unsubscribe,
    muteLocal,
    muteLocalEx,
    muteRemote,
    selectLayer,
    message,
    getDevices,
    setDevice,
    audioReport,
    videoReport,
    recordLocal,
    recordLocalEx,
    recordRemote,
    printLocal,
    printLocalEx,
    printRemote,
    updateInfo,
    startWebPage,
    pauseWebPage,
    stopWebPage,
    userPlay,
    checkRequirement,
    setRole,
    audioTest,
    pauseAllStreamAudio,
    resumeAllStreamAudio,
    getDeviceInfo,
    publishDataChannel,
    leave,
    askForPermission,
    removeListener,
    StreamType,
    StreamTrack,
} = hirtcwebsdk;

export const HiRTC_STREAM_TYPE = {
    CAMERA: StreamType.Camera,
    SCREEN: StreamType.Screen,
} 

export const HiRTC_ROLE = {
    ADV_TML: 0,                 // 终端用户，可发布可订阅
    TML:     1,                 // 终端用户，仅订阅
    ADV_SYS: 2,                 // 系统用户，可发布可订阅
    SYS:     3.                 // 系统用户，仅订阅
}

export const HiRTC_ERROR_CODE = {
    PARAM_ERROR:         ErrorCode.ParamsError,
    JOIN_ERROR:          ErrorCode.JoinError,
    PREVIEW_ERROR:       ErrorCode.PreviewError,
    PUBLISH_ERROR:       ErrorCode.PublishError,
    SUBSCRIBE_ERROR:     ErrorCode.SubscribeError,
    SELECT_DEVICE_ERROR: ErrorCode.SetDeviceError,
    RECORD_ERROR:        ErrorCode.RecordError,
    CAPTURE_ERROR:       ErrorCode.PrintError,
}

export const HiRTC_STREAM_TRACK = {
    VIDOE: StreamTrack.Video,
    AUDIO: StreamTrack.Audio,
    isVideo(track) {
        return this.VIDOE === track;
    },
    isAudio(track) {
        return this.AUDIO === track;
    }
}
const { setHandlers, getHandlers } = (function () {
    let handlers_ = {};
    return {
        setHandlers: function(handlers) {
            handlers_ = handlers;
        },
        getHandlers: function () {
            return handlers_;
        }
    }
})();

export function getNewHiRTCInstance() {
    return create();
}

/**
** 初始化聚连 HiRTC
*/
export function doInitHiRTC({
    options = {},
    handlers = {
        handleAudioReport   : identity,
        handleVideoReport   : identity,
        handleJoined        : identity,
        handleCameraPreview : identity,
        handleSreenPreview  : identity,
        handlePublished     : identity,
        handleSubscribed    : identity,
        handleSomeoneJoined : identity,
        handleSomeoneLeft   : identity,
        handleStreamAdded   : identity,
        handleStreamRemoved : identity,
        handleStreamUpdated : identity,
        handleDisconnected  : identity,
        handleReconnected   : identity,
        handleError         : identity
    },
    deviceHandlers = {
        handlePermission    : identity,
        handleDeviceList    : identity,
        handleDeviceChanged : identity,
    }
} = {}) {
    const mergeOpt = {
        cameraLayers: [
            {
                layerIndex: 0,
                width: 320,
                height: 180,
                frameRate: 15,
                targetBw: 375000,
            },
            {
                layerIndex: 1,
                width: 640,
                height: 360,
                frameRate: 20,
                targetBw: 750000,
            },
            {
                layerIndex: 2,
                width: 1280,
                height: 720,
                frameRate: 30,
                targetBw: 1500000,
            },
        ],
        debug: false,
        forceArea: true,
        leaveBeforeUnload: false,
        requestTimeout: 1000,
        screenEnableAudio: true,
        screenLayers: [
            {
                layerIndex: 0,
                width: 1920,
                height: 1080,
                frameRate: 15,
                targetBw: 1500000,
            }
        ],
        serviceID: '',
        serviceKey: '',
        Services: { BasicRoomServiceToken: 'https://121.36.105.19:7080/v1/auth/token' },
        audio: true,
        video: true,
    }
    Object.assign(mergeOpt, options);
    setHandlers(handlers);
    registerDeviceHandlers(deviceHandlers);
    initOption(mergeOpt);
    onUnload(handlers, deviceHandlers);
}

function onUnload(handlers, deviceHandlers) {
    window.addEventListener('unload', function () {
        unregisterHandler(handlers); 
        unregisterDeviceHandlers(deviceHandlers);   
    });
}

function registerDeviceHandlers({
    handlePermission    = identity,
    handleDeviceList    = identity,
    handleDeviceChanged = identity,
} = {}) {
    addListener('permission',    handlePermission   );
    addListener('deviceList',    handleDeviceList   );
    addListener('deviceChanged', handleDeviceChanged);
}

function unregisterDeviceHandlers({
    handlePermission    = identity,
    handleDeviceList    = identity,
    handleDeviceChanged = identity,
} = {}) {
    removeListener('permission',    handlePermission   );
    removeListener('deviceList',    handleDeviceList   );
    removeListener('deviceChanged', handleDeviceChanged);
}

/**
** 注册回调事件
**  handlePermission: 音视频设备权限回调
**  handleDeviceList: 获取设备列表回调
**  handleDeviceChanged: 硬件插拔事件
**  handleJoined: 进房成功
**  handleCameraPreview: 本地音视频预览回调
**  handleSreenPreview: 屏幕共享预览回调
**  handlePublished: 本地音视频/屏幕共享发布成功
**  handleSubscribed: 订阅远端流成功
**  handleSomeoneJoined: 远端用户加入
**  handleSomeoneLeft: 远端用户离开
**  handleStreamAdded: 远端用户发布流
**  handleStreamRemoved: 远端用户取消流
**  handleStreamUpdated: 远端用户更新流状态（开关音视频）
**  handleDisconnected: 服务器断开,若已进房成功,会自动重连
**  handleReconnected: 重连成功
**  handleError: 错误处理
*/
function registerHandler({
    handleAudioReport   = identity,
    handleVideoReport   = identity,
    handleJoined        = identity,
    handleCameraPreview = identity,
    handleSreenPreview  = identity,
    handlePublished     = identity,
    handleSubscribed    = identity,
    handleSomeoneJoined = identity,
    handleSomeoneLeft   = identity,
    handleStreamAdded   = identity,
    handleStreamRemoved = identity,
    handleStreamUpdated = identity,
    handleDisconnected  = identity,
    handleReconnected   = identity,
    handleError         = identity
} = {}) {
    addListener('audioReport',   handleAudioReport  );
    addListener('videoReport',   handleVideoReport  );
    addListener('joined',        handleJoined       );
    addListener('camera',        handleCameraPreview);
    addListener('screen',        handleSreenPreview );
    addListener('published',     handlePublished    );
    addListener('subscribed',    handleSubscribed   );
    addListener('someoneJoined', handleSomeoneJoined);
    addListener('someoneLeft',   handleSomeoneLeft  );
    addListener('streamAdded',   handleStreamAdded  );
    addListener('streamRemoved', handleStreamRemoved);
    addListener('streamUpdated', handleStreamUpdated);
    addListener('disconnected',  handleDisconnected );
    addListener('reconnected',   handleReconnected  );
    addListener('error',         handleError        );
}

function unregisterHandler({
    handleAudioReport   = identity,
    handleVideoReport   = identity,
    handleJoined        = identity,
    handleCameraPreview = identity,
    handleSreenPreview  = identity,
    handlePublished     = identity,
    handleSubscribed    = identity,
    handleSomeoneJoined = identity,
    handleSomeoneLeft   = identity,
    handleStreamAdded   = identity,
    handleStreamRemoved = identity,
    handleStreamUpdated = identity,
    handleDisconnected  = identity,
    handleReconnected   = identity,
    handleError         = identity
} = {}) {
    removeListener('audioReport',   handleAudioReport  );
    removeListener('videoReport',   handleVideoReport  );
    removeListener('joined',        handleJoined       );
    removeListener('camera',        handleCameraPreview);
    removeListener('screen',        handleSreenPreview );
    removeListener('published',     handlePublished    );
    removeListener('subscribed',    handleSubscribed   );
    removeListener('someoneJoined', handleSomeoneJoined);
    removeListener('someoneLeft',   handleSomeoneLeft  );
    removeListener('streamAdded',   handleStreamAdded  );
    removeListener('streamRemoved', handleStreamRemoved);
    removeListener('streamUpdated', handleStreamUpdated);
    removeListener('disconnected',  handleDisconnected );
    removeListener('reconnected',   handleReconnected  );
    removeListener('error',         handleError        );
}

/**
** 初始化配置
** audio: 语音权限
** video: 视频权限
** leaveBeforeUnload: 页面关闭时是否离开房间
** forceArea: 强制areacode,可选,设置为ture时强制使用areacode设置区域代码进入房间，默认为false,使用ip/info接口获取ip信息进入房间
** serviceID: 证书ID，必选
** serviceKey: 证书KEY，必选
** publicCloud: 可选，是否共有云环境，默认值为true
** services{ 服务接口配置
**     BasicRoomServiceToken: 公网环境 'https://brs-hirtc.hismarttv.com/v1/auth/token' 内网私有化环境 'https://brs-hirtc-julinker.hisense.com/v1/auth/token'
**     IpInfoService: 公网环境 'https://bas-web.hismarttv.com/1.0/bas/ip/info' 内网私有化环境 'https://ipsvc-bas-julinker.hisense.com/1.0/bas/ip/info'
** }
** requestTimeout: 请求超时时间毫秒，默认值为1000
** cameraLayers[{
**     layerIndex: 0, 层序号，从0开始
**     width: 320, 分辨率宽
**     height: 180, 分辨率高
**     frameRate: 15, 帧率
**     targetBw: 375000 带宽字节
** }, {
**     layerIndex: 1,
**     width: 640,
**     height: 360,
**     frameRate: 20,
**     targetBw: 750000
** }. {
**     layerIndex: 2,
**     width: 1280,
**     height: 720,
**     frameRate: 30,
**     targetBw: 1500000
** }]
** screenLayers[{ 共享视频多层配置
**     layerIndex: 0,
**     width: 1920,
**     height: 1080,
**     frameRate: 15,
**     targetBw: 1500000
** }] 
*/
function initOption({
    cameraLayers = [
        {
            layerIndex: 0,
            width: 320,
            height: 180,
            frameRate: 15,
            targetBw: 375000,
        },
        {
            layerIndex: 1,
            width: 640,
            height: 360,
            frameRate: 20,
            targetBw: 750000,
        },
        {
            layerIndex: 2,
            width: 1280,
            height: 720,
            frameRate: 30,
            targetBw: 1500000,
        },
    ],
    debug = false,
    forceArea = true,
    leaveBeforeUnload = false,
    requestTimeout = 1000,
    screenEnableAudio = true,
    screenLayers = [
        {
            layerIndex: 0,
            width: 1920,
            height: 1080,
            frameRate: 15,
            targetBw: 1500000,
        }
    ],
    serviceID = '',
    serviceKey = '',
    Services = { BasicRoomServiceToken: 'https://121.36.105.19:7080/v1/auth/token' },
    audio = true,
    video = true,
} = {}) {
    init({
        cameraLayers,
        debug,
        forceArea,
        leaveBeforeUnload,
        requestTimeout,
        screenEnableAudio,
        screenLayers,
        serviceID,
        serviceKey,
        Services
    });
    getPermission({ audio, video });
} 

export function getPermission({ audio = true, video = true }) {
    askForPermission(audio, video);
}
const curData = {};
/**
** roomId
** userId
** userName
** areaCode 默认为'1'，若init时forceArea为ture, 则此值作为强制项登陆房间,如果为alse,则先请求ip信息,然后根据ip信息登陆房间
** role: 可选，用户角色， 0-终端用户，可发布可订阅； 1-终端用户，仅订阅； 2-系统用户，可发布可订阅； 3-系统用户，仅订阅。 默认值为0，若进房前调用setRole，可改变默认值
*/
export function joinRoom({ callData, userID, userName, areaCode = '1', role = 0 } = {}) {
    const { 
        roomId 
    } = callData;
    join(roomId, userID, userName, areaCode, role);
    const handlers = getHandlers();
    registerHandler(handlers);
    Object.assign(curData, {...callData, joined: false, previewed: false});
}

export function getCurData() {
    return curData;
}

export function previewStart({video, type = HiRTC_STREAM_TYPE.CAMERA} = {}) {
    preview(video, type, true);
}

export function previewStop(type = HiRTC_STREAM_TYPE.CAMERA) {
    preview(null, type, false);
}

export function publishStream(type = HiRTC_STREAM_TYPE.CAMERA) {
    console.log('media service publish stream: ', type);
    publish(type);
}
/**
** 选择视频层
** subscriberId - 订阅流id 
** layerIndex - 视频层序号
*/
export function selectVideoLayer({ subscribeId, layerIndex } = {}) {
    selectLayer(subscribeId, layerIndex);
}
/**
** 发送消息
** data|{string} - 消息内容
** users|{Object[]} - 接收者uid列表
*/
export function sendMessage({ data, users } = {}) {
    message(data, users);
}

export function unpublishStrean(type = HiRTC_STREAM_TYPE.CAMERA) {
    unpublish(type);
}

export function subscribeStream({ 
    videoEle = null, 
    userID, 
    publishID, 
    layerIndex = 0, 
    muteAudio = false, 
    muteVideo = false
} = {}) {
    subscribe(videoEle, userID, publishID, layerIndex, muteAudio, muteVideo);
}

export function unsubscribeStream({ publishId, subscribeId }) {
    unsubscribe(publishId, subscribeId);
}

export function muteLocalA({ type = HiRTC_STREAM_TYPE.CAMERA, muteAudio } = {}) {
    muteLocal(type, {
        muteAudio
    });
}

export function muteLocalV({ type = HiRTC_STREAM_TYPE.CAMERA, muteVideo } = {}) {
    muteLocal(type, {
        muteVideo
    });
}

export function muteLocalAll({ type = HiRTC_STREAM_TYPE.CAMERA } = {}) {
    muteLocal(type, {
        muteVideo: true,
        muteAudio: true
    });
}

export function muteRemoteA({ subscribeId, muteAudio } = {}) {
    muteRemote(subscribeId, { muteAudio });
}

export function muteRemoteV({ subscribeId, muteVideo } = {}) {
    muteRemote(subscribeId, { muteVideo });
}

export function muteRemoteAll({subscribeId} = {}) {
    muteRemote(subscribeId, { muteVideo: true, muteAudio: true });
}

export function getDeviceList(enableDetail = false) {
    getDevices(enableDetail);
}
/**
** 创建视频房间设置的采集/播放设备 
*/
export function selectVideoDevices({ viDid, aiDid, aoDid } = {}) {
    setAudioInputDevice(aiDid);
    setVideoInputDevice(viDid);
    setAudioOutputDevice(aoDid);
}
/**
** 创建语音房间设置的采集/播放设备 
** 不设置视频输出设备，即为语音房间
*/
export function selectAudioDevices({ aiDid, aoDid } = {}) {
    setAudioInputDevice(aiDid);
    setAudioOutputDevice(aoDid);
}

export function setAudioInputDevice(deviceId) {
    setDevice('audioinput', deviceId);
}

export function setVideoInputDevice(deviceId) {
    setDevice('videoinput', deviceId);
}

export function setAudioOutputDevice(deviceId) {
    setDevice('audiooutput', deviceId);
}

export function startRecordLocal(type = HiRTC_STREAM_TYPE.CAMERA) {
    return recordLocal(type, true);
}

export function stopRecordLocal({type = HiRTC_STREAM_TYPE.CAMERA, autoDownload = true} = {}) {
    return recordLocal(type, false, autoDownload);
}

export function startRecordRemote(subscribeId) {
    return recordRemote(subscribeId, true);
}

export function stopRecordRemote({subscribeId, autoDownload = true} = {}) {
    return recordRemote(subscribeId, false, autoDownload);
}

export function captureLocalImage(type = HiRTC_STREAM_TYPE.CAMERA, autoDownload = true) {
    return printLocal(type, autoDownload);
}

export function captureRemoteImage(subscribeId, autoDownload = true) {
    return printRemote(subscribeId, autoDownload);
}

export function changeRole(role = HiRTC_ROLE.ADV_TML) {
    setRole(role);
}

export function getDeviceInfoById(deviceId) {
    return getDeviceInfo(deviceId);
}
/**
** 流音频状态报告
**  audio-标签
**  enableInspire-是否开启语音激励反馈
*/
export function audioInfoReport({ enable = true, interval = 1500, audio = null, enableInspire = false } = {}) {
    audioReport(enable, interval, audio, enableInspire);
}
/**
** 流视频状态报告 
*/
export function videoInfoReport({ enable = true, interval = 1500 } = {}) {
    videoReport(enable, interval);
}
/**
** 开始页面任务, 云录制需要额外申请开通， 接口需要的参数，是开通服务器后，通过接口获取的。
** @param {string} taskId - task id
** @param {number} type - 0-保留，无效 1-直播（2^0） 2-录制（2^1）可以是组合比如3=1+2，代表直播并录制
** @param {number} bps
** @param {number} fps
** @param {number} width - 辨率宽
** @param {number} height - 分辨率高
** @param {string} url - Web页面URL
** @param {string} streamServer - 推流地址
*! @param {string} [callback]
 */
export function startCloudRecord({ taskId, type, bps, fps, width, height, url, streamServer, callback = identity } = {}) {
    startWebPage(taskId, type, bps, fps, width, height, url, streamServer, callback);
}

export function pauseCloudRecord(taskId) {
    pauseWebPage(taskId, true);
}

export function resumeCloudRecord(taskId) {
    pauseWebPage(taskId, false);
}

export function stopCloudRecord(taskId) {
    stopWebPage(taskId);
}

// eslint-disable-next-line no-unused-vars
export function leaveRoom(roomId) {
    leave();
}

/**
 ** 离开房间并取消预览 
 ** 1. 离开房间，调用leave()
 ** 2. 取消所有事件监听
 ** 3. 取消预览，调用 preview(null, "camera",  false)。如果启动了屏幕共享，preview(null, "screen",  false)
 ** 4. 如果启动了数据监控，也取消一下。 videoReport(false), audioReport(false)
 */
export function leaveHiRTC(roomId) {
    return () => {
        previewStop();
        leaveRoom(roomId);
        const handlers = getHandlers();
        unregisterHandler(handlers);
        videoInfoReport({ enable: false });
        audioInfoReport({ enable: false });
    };
}

export function getMaxStreamLayerIndex(stream) {
    const layerIndex = pipe(
        ({layers}) => layers,
        layers => layers[layers.length - 1].layerIndex
    )(stream);
    return layerIndex
}