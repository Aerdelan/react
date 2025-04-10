/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/

import { identity, pipe } from "../utils/functional-utils";

const {
    create,
    ErrorCode,
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

export const HiRTC_RECORD_TYPE = {
    ALL:        1,
    ONLY_AUDIO: 2,
    ONLY_VIDEO: 3,
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
const { setHandlers, getHandlers, setMonitorRTC, getMonitorRTC } = (function () {
    let handlers_   = {};
    let monitorRTC_ = null;
    return {
        setHandlers: function(handlers, id) {
            handlers_[id] = handlers;
        },
        getHandlers: function (id) {
            return handlers_[id];
        },
        setMonitorRTC: function (monitorRTC) {
            monitorRTC_ = monitorRTC;
        },
        getMonitorRTC: function () {
            return monitorRTC_;
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
    hirtcwebsdk.udata = 'call_rtc';
    setHandlers(handlers, hirtcwebsdk.udata);
    registerDeviceHandlers(deviceHandlers);
    initOption(mergeOpt);
    onUnload(handlers, deviceHandlers);
}

/**
** 初始化视频监控 HiRTC
*/
export function doInitMonitorHiRTC({
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
    const monitorRTC = getNewHiRTCInstance();
    monitorRTC.udata = 'monitor_rtc';
    setHandlers(handlers, monitorRTC.udata);
    setMonitorRTC(monitorRTC);
    registerDeviceHandlers(deviceHandlers, monitorRTC);
    initOption(mergeOpt, monitorRTC);
    onUnload(handlers, deviceHandlers, monitorRTC);
    return monitorRTC;
}

function onUnload(handlers, deviceHandlers, instance = hirtcwebsdk) {
    window.addEventListener('unload', function () {
        unregisterHandler(handlers, instance); 
        unregisterDeviceHandlers(deviceHandlers, instance);   
    });
}

function registerDeviceHandlers({
    handlePermission    = identity,
    handleDeviceList    = identity,
    handleDeviceChanged = identity,
} = {}, instance = hirtcwebsdk) {
    instance.addListener('permission',    handlePermission   );
    instance.addListener('deviceList',    handleDeviceList   );
    instance.addListener('deviceChanged', handleDeviceChanged);
}

function unregisterDeviceHandlers({
    handlePermission    = identity,
    handleDeviceList    = identity,
    handleDeviceChanged = identity,
} = {}, instance = hirtcwebsdk) {
    instance.removeListener('permission',    handlePermission   );
    instance.removeListener('deviceList',    handleDeviceList   );
    instance.removeListener('deviceChanged', handleDeviceChanged);
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
} = {}, instance = hirtcwebsdk) {
    instance.addListener('audioReport',   handleAudioReport  );
    instance.addListener('videoReport',   handleVideoReport  );
    instance.addListener('joined',        handleJoined       );
    instance.addListener('camera',        handleCameraPreview);
    instance.addListener('screen',        handleSreenPreview );
    instance.addListener('published',     handlePublished    );
    instance.addListener('subscribed',    handleSubscribed   );
    instance.addListener('someoneJoined', handleSomeoneJoined);
    instance.addListener('someoneLeft',   handleSomeoneLeft  );
    instance.addListener('streamAdded',   handleStreamAdded  );
    instance.addListener('streamRemoved', handleStreamRemoved);
    instance.addListener('streamUpdated', handleStreamUpdated);
    instance.addListener('disconnected',  handleDisconnected );
    instance.addListener('reconnected',   handleReconnected  );
    instance.addListener('error',         handleError        );
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
} = {}, instance = hirtcwebsdk) {
    instance.removeListener('audioReport',   handleAudioReport  );
    instance.removeListener('videoReport',   handleVideoReport  );
    instance.removeListener('joined',        handleJoined       );
    instance.removeListener('camera',        handleCameraPreview);
    instance.removeListener('screen',        handleSreenPreview );
    instance.removeListener('published',     handlePublished    );
    instance.removeListener('subscribed',    handleSubscribed   );
    instance.removeListener('someoneJoined', handleSomeoneJoined);
    instance.removeListener('someoneLeft',   handleSomeoneLeft  );
    instance.removeListener('streamAdded',   handleStreamAdded  );
    instance.removeListener('streamRemoved', handleStreamRemoved);
    instance.removeListener('streamUpdated', handleStreamUpdated);
    instance.removeListener('disconnected',  handleDisconnected );
    instance.removeListener('reconnected',   handleReconnected  );
    instance.removeListener('error',         handleError        );
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
} = {}, instance = hirtcwebsdk) {
    instance.init({
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
    getPermission({ audio, video }, instance);
} 

export function getPermission({ audio = true, video = true }, instance = hirtcwebsdk) {
    instance.askForPermission(audio, video);
}
/**
** roomId
** userId
** userName
** areaCode 默认为'1'，若init时forceArea为ture, 则此值作为强制项登陆房间,如果为alse,则先请求ip信息,然后根据ip信息登陆房间
** role: 可选，用户角色， 0-终端用户，可发布可订阅； 1-终端用户，仅订阅； 2-系统用户，可发布可订阅； 3-系统用户，仅订阅。 默认值为0，若进房前调用setRole，可改变默认值
*/
export function joinRoom({ callData, userID, userName, areaCode = '1', role = 0 } = {}, instance = hirtcwebsdk) {
    const { 
        roomId 
    } = callData;
    instance.join(roomId, userID, userName, areaCode, role);
    const handlers = getHandlers(instance.udata);
    registerHandler(handlers, instance);
    const curData = {};
    Object.assign(curData, {...callData, joined: false, previewed: false});
    instance.curData = curData;
}

export function joinMonitorRoom({ callData, userID, userName, areaCode = '1', role = 0 } = {}) {
    const instance = getMonitorRTC();
    joinRoom({ callData, userID, userName, areaCode, role }, instance);
}

export function getCurData(instance = hirtcwebsdk) {
    return instance.curData;
}

export function getMonitorCurData() {
    const instance = getMonitorRTC();
    return getCurData(instance);
}

export function previewStart({video, type = HiRTC_STREAM_TYPE.CAMERA} = {}, instance = hirtcwebsdk) {
    instance.preview(video, type, true);
}

export function previewMonitorStart({video, type = HiRTC_STREAM_TYPE.CAMERA} = {}) {
    const instance = getMonitorRTC();
    previewStart({video, type}, instance);
}

export function previewStop(type = HiRTC_STREAM_TYPE.CAMERA, instance = hirtcwebsdk) {
    instance.preview(null, type, false);
}

export function publishStream(type = HiRTC_STREAM_TYPE.CAMERA, instance = hirtcwebsdk) {
    console.log('media service publish stream: ', type);
    instance.publish(type);
}

export function publishMonitorStream(type = HiRTC_STREAM_TYPE.CAMERA) {
    const instance = getMonitorRTC();
    publishStream(type, instance);
}

/**
** 选择视频层
** subscriberId - 订阅流id 
** layerIndex - 视频层序号
*/
export function selectVideoLayer({ subscribeId, layerIndex } = {}, instance = hirtcwebsdk) {
    instance.selectLayer(subscribeId, layerIndex);
}
/**
** 发送消息
** data|{string} - 消息内容
** users|{Object[]} - 接收者uid列表
*/
export function sendMessage({ data, users } = {}, instance = hirtcwebsdk) {
    instance.message(data, users);
}

export function unpublishStrean(type = HiRTC_STREAM_TYPE.CAMERA, instance = hirtcwebsdk) {
    instance.unpublish(type);
}

export function subscribeStream({ 
    videoEle = null, 
    userID, 
    publishID, 
    layerIndex = 0, 
    muteAudio = false, 
    muteVideo = false
} = {}, instance = hirtcwebsdk) {
    instance.subscribe(videoEle, userID, publishID, layerIndex, muteAudio, muteVideo);
}

export function subscribeMonitorStream({ 
    videoEle = null, 
    userID, 
    publishID, 
    layerIndex = 0, 
    muteAudio = false, 
    muteVideo = false
} = {}) {
    const instance = getMonitorRTC();
    subscribeStream({videoEle, userID, publishID, layerIndex, muteAudio, muteVideo}, instance);
}

export function unsubscribeStream({ publishId, subscribeId }, instance = hirtcwebsdk) {
    instance.unsubscribe(publishId, subscribeId);
}

export function unsubscribeMonitorStream({ publishId, subscribeId }) {
    const instance = getMonitorRTC();
    unsubscribeStream({publishId, subscribeId}, instance);
}

export function muteLocalA({ type = HiRTC_STREAM_TYPE.CAMERA, muteAudio } = {}, instance = hirtcwebsdk) {
    instance.muteLocal(type, {
        muteAudio
    });
}

export function muteMonitorLocalA({ type = HiRTC_STREAM_TYPE.CAMERA, muteAudio } = {}) {
    const instance = getMonitorRTC();
    muteLocalA({type, muteAudio}, instance);
}

export function muteLocalV({ type = HiRTC_STREAM_TYPE.CAMERA, muteVideo } = {}, instance = hirtcwebsdk) {
    instance.muteLocal(type, {
        muteVideo
    });
}

export function muteLocalAll({ type = HiRTC_STREAM_TYPE.CAMERA } = {}, instance = hirtcwebsdk) {
    instance.muteLocal(type, {
        muteVideo: true,
        muteAudio: true
    });
}

export function muteRemoteA({ subscribeId, muteAudio } = {}, instance = hirtcwebsdk) {
    instance.muteRemote(subscribeId, { muteAudio });
}

export function muteMonitorRemoteA({ subscribeId, muteAudio } = {}) {
    const instance = getMonitorRTC();
    return muteRemoteA({subscribeId, muteAudio}, instance);
}

export function muteRemoteV({ subscribeId, muteVideo } = {}, instance = hirtcwebsdk) {
    instance.muteRemote(subscribeId, { muteVideo });
}

export function muteRemoteAll({subscribeId} = {}, instance = hirtcwebsdk) {
    instance.muteRemote(subscribeId, { muteVideo: true, muteAudio: true });
}

export function getDeviceList(enableDetail = false, instance = hirtcwebsdk) {
    instance.getDevices(enableDetail);
}

export function getMonitorDeviceList(enableDetail = false) {
    const instance = getMonitorRTC();
    getDeviceList(enableDetail, instance);
}

/**
** 创建视频房间设置的采集/播放设备 
*/
export function selectVideoDevices({ viDid, aiDid, aoDid } = {}, instance = hirtcwebsdk) {
    setAudioInputDevice(aiDid, instance);
    setVideoInputDevice(viDid, instance);
    setAudioOutputDevice(aoDid, instance);
}
/**
** 创建语音房间设置的采集/播放设备 
** 不设置视频输出设备，即为语音房间
*/
export function selectAudioDevices({ aiDid, aoDid } = {}, instance = hirtcwebsdk) {
    setAudioInputDevice(aiDid, instance);
    setAudioOutputDevice(aoDid, instance);
}

export function selectMonitorAudioDevices({ aiDid, aoDid } = {}) {
    const instance = getMonitorRTC();
    selectAudioDevices({aiDid, aoDid}, instance);
}

export function setAudioInputDevice(deviceId, instance = hirtcwebsdk) {
    instance.setDevice('audioinput', deviceId);
}

export function setVideoInputDevice(deviceId, instance = hirtcwebsdk) {
    instance.setDevice('videoinput', deviceId);
}

export function setAudioOutputDevice(deviceId, instance = hirtcwebsdk) {
    instance.setDevice('audiooutput', deviceId);
}

export function startRecordLocal(type = HiRTC_STREAM_TYPE.CAMERA, instance = hirtcwebsdk) {
    return instance.recordLocal(type, true);
}

export function startMonitorRecordLocal(type = HiRTC_STREAM_TYPE.CAMERA) {
    const instance = getMonitorRTC();
    return startRecordLocal(type, instance);
}

export function stopRecordLocal({type = HiRTC_STREAM_TYPE.CAMERA, autoDownload = true} = {}, instance = hirtcwebsdk) {
    return instance.recordLocal(type, false, autoDownload);
}

export function stopMonitorRecordLocal({type = HiRTC_STREAM_TYPE.CAMERA, autoDownload = true} = {}) {
    const instance = getMonitorRTC();
    return stopRecordLocal({type, autoDownload}, instance);
}
/**
** tyep 1: 音视频, 2: 纯音频, 3: 纯视频 
*/
export function startRecordRemote(subscribeId, type = HiRTC_RECORD_TYPE.ALL, instance = hirtcwebsdk) {
    return instance.recordRemote(subscribeId, true, false, type);
}

export function startMonitorRecordRemote(subscribeId) {
    const instance = getMonitorRTC();
    return startRecordRemote(subscribeId, HiRTC_RECORD_TYPE.ALL, instance);
}

export function stopRecordRemote({subscribeId, autoDownload = true} = {}, instance = hirtcwebsdk) {
    return instance.recordRemote(subscribeId, false, autoDownload);
}

export function stopMonitorRecordRemote({subscribeId, autoDownload = true} = {}) {
    const instance = getMonitorRTC();
    return stopRecordRemote({subscribeId, autoDownload}, instance);
}

export function captureLocalImage(type = HiRTC_STREAM_TYPE.CAMERA, autoDownload = true, instance = hirtcwebsdk) {
    return instance.printLocal(type, autoDownload);
}

export function captureRemoteImage(subscribeId, autoDownload = true, instance = hirtcwebsdk) {
    return instance.printRemote(subscribeId, autoDownload);
}

export function changeRole(role = HiRTC_ROLE.ADV_TML, instance = hirtcwebsdk) {
    instance.setRole(role);
}

export function getDeviceInfoById(deviceId, instance = hirtcwebsdk) {
    return instance.getDeviceInfo(deviceId);
}
/**
** 流音频状态报告
**  audio-标签
**  enableInspire-是否开启语音激励反馈
*/
export function audioInfoReport({ enable = true, interval = 1500, audio = null, enableInspire = false } = {}, instance = hirtcwebsdk) {
    instance.audioReport(enable, interval, audio, enableInspire);
}
/**
** 流视频状态报告 
*/
export function videoInfoReport({ enable = true, interval = 1500 } = {}, instance = hirtcwebsdk) {
    instance.videoReport(enable, interval);
}

export function videoMonitorInfoReport({ enable = true, interval = 1500 } = {}) {
    const instance = getMonitorRTC();
    videoInfoReport({enable, interval}, instance);
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
export function startCloudRecord({ taskId, type, bps, fps, width, height, url, streamServer, callback = identity } = {}, instance = hirtcwebsdk) {
    instance.startWebPage(taskId, type, bps, fps, width, height, url, streamServer, callback);
}

export function pauseCloudRecord(taskId, instance = hirtcwebsdk) {
    instance.pauseWebPage(taskId, true);
}

export function resumeCloudRecord(taskId, instance = hirtcwebsdk) {
    instance.pauseWebPage(taskId, false);
}

export function stopCloudRecord(taskId, instance = hirtcwebsdk) {
    instance.stopWebPage(taskId);
}

// eslint-disable-next-line no-unused-vars
export function leaveRoom(roomId, instance = hirtcwebsdk) {
    instance.leave();
}

/**
 ** 离开房间并取消预览 
 ** 1. 离开房间，调用leave()
 ** 2. 取消所有事件监听
 ** 3. 取消预览，调用 preview(null, "camera",  false)。如果启动了屏幕共享，preview(null, "screen",  false)
 ** 4. 如果启动了数据监控，也取消一下。 videoReport(false), audioReport(false)
 */
export function leaveHiRTC(roomId, instance = hirtcwebsdk) {
    return () => {
        previewStop(HiRTC_STREAM_TYPE.CAMERA, instance);
        leaveRoom(roomId, instance);
        const handlers = getHandlers(instance.udata);
        unregisterHandler(handlers, instance);
        videoInfoReport({ enable: false }, instance);
        audioInfoReport({ enable: false }, instance);
    };
}

export function leaveMonitorRoom(roomId) {
    const instance = getMonitorRTC();
    return leaveHiRTC(roomId, instance);
}

export function getMaxStreamLayerIndex(stream) {
    const layerIndex = pipe(
        ({layers}) => layers,
        layers => layers[layers.length - 1].layerIndex
    )(stream);
    return layerIndex
}