# ▶ Media SDK 集成说明

## 安装依赖

```javascript
npm install / pnpm install
```

## 本地开发

```javascript
npm run dev / pnpm dev
```

## 编译打包

```javascript
npm run build / pnpm build
```

## 1 第三方库依赖

加载 SDK 前需要引入以下第三方库（路径根据实际情况填写）：

```javascript
<script type="text/javascript" src="./3rdparty/HiRTC/crypto-js.js"></script>
<script type="text/javascript" src="./3rdparty/HiRTC/base64.js"></script>
<script type="text/javascript" src="./3rdparty/HiRTC/adapter.js"></script>
<script type="text/javascript" src="./3rdparty/HiRTC/sign.js"></script>
<script type="text/javascript" src="./3rdparty/HiRTC/saver.js"></script>
<script type="text/javascript" src="./3rdparty/HiRTC/sdk.js"></script>
```

## 2 加载 SDK

引入 SDK 库文件：

```javascript
import { ... } from './media-sdk.js'
```

# ▶ Media SDK 说明

受限于浏览器各种安全限制，请部署在带有 ssl 加密传输的 web 服务器上，以便体验完整功能。 demo 中的用法仅为示例，可参考使用，但不作为固定的集成方法。

# ▶ Media SDK 数据结构说明

```javascript
/** 通话类型 **/
const CALL_TYPE = {
    NONE:               '',                     //* 无
    VOICE:              'voice',                //* 语音通话
    VOICE_CONFERENCE:   'voice_conference',     //* 语音会议
    TEMP_PTT:           'tempptt',              //* 临时对讲
    PTT:                'ptt',                  //* 固定对讲
    BROADCAST:          'shout',                //* 广播喊话
    VIDEO:              'video',                //* 视频通话
    VIDEO_CONFERENCE:   'video_conference',     //* 视频会议
    FORCE_INSERT:       'force_insert',         //* 强插
    FORCE_MONITOR:      'force_monitor',        //* 监听
}
/** 通话事件 **/
const CALL_EVENT = {
	INIT:               0,
	ADD_SUCCESS:        11,                     //* 会议邀请成功
	ADD_FAILED:         12,
	END_FAILED:         13,                     //* 会议结束失败
	END_SUCCESS:        14,
	START_SUCCESS:      15,                     //* 会议开始成功
	START_FAILED:       16,
	KICK_SUCCESS:       17,                     //* 成员踢出成功
	KICK_FAILED:        18,
	MUTE_SUCCESS:       19,                     //* 禁言成功
	MUTE_FAILED:        20,
	GRAB_SUCCESS:       21,                     //* 抢话成功
	GRAB_FAILED:        22,
    FREE_SUCCESS:       23,                     //* 释放话权啊成功
	FREE_FAILED:        24,
	MEM_REFUSE:         25,                     //* 终端拒绝加入会议
    SOCKET_ERROR:       26,                     //* websocketchu出现错误
    SDP_FAILED:         27,                     //* SDP协商失败
    SUBS_FAILED:        28,                     //* 订阅对端媒体失败
    MEM_UPDATE:         29,                     //* 会议成员更新
    MEM_ACCEPT:         30,                     //* 会议成员同意加入
    MEM_KICKED:         31,                     //* 当前成员被踢出
};
/** 成员的状态 **/
const MEM_STATUS = {
	INIT:               0,                      //* 无状态
	CALLING:            1,                      //* 正在呼叫
	JOINED:             2,                      //* 已加入
	QUIT:               3,                      //* 已退出
    REJECTED:           4,                      //* 已拒绝
}
/** 发起童话请求的数据结构 **/
const callData = {
    callType,                                   //* 发起通话类型
    fromUserId: '',                             //* 本端呼叫Id
    fromUserName: '',
    members: {callNo: member},                  //* 会议成员Map
    previewHint: null,                          //* 预览渲染的DOM
    renderHint: null,                           //* 对端渲染的DOM
    toUserId: '',                               //* 对端呼叫Id
    toUserName: '',
}
/** 发起群组通话 **/
const member = {
    callNo: '',
    name: '',
    renderHint: null,                           //* 视频会议渲染元素
    isHost: false,                              //* 是否为主持人
}
/** 远程控制指令 */
const CHILD_MSG_TYPE = {
    GrMessage:          "GrMessage",            //* 警令消息推送
	DaVideoS:           "DaVideoS",             //* 终端开启本地录像
	DaVideoE:           "DaVideoE",             //* 终端终止本地录像
	DaPhotoS:           "DaPhotoS",             //* 终端拍照
	DaTapeS:            "DaTapeS",              //* 开启本地录音
	DaRtmpS:            "DaRtmpS",              //* 开启视频监控
	DaRecordAndMonitor: "DaRecordAndMonitor",   //* 开始视频监控并通知本地录像
	DaRtmpSResp:        "DaRtmpSResp",          //* 开启视频监控响应
	DaRtmpE:            "DaRtmpE",              //* 关闭视频监控
	DaRtmpEResp:        "DaRtmpEResp",          //* 关闭视频监控响应
	DaRtmpP:            "DaRtmpP",              //* 视频监控转发
	DaSnapS:            "DaSnapS",              //* 开启快照模式
	DaSnapSResp:        "DaSnapSResp",          //* 开启快照模式响应
	DaSnapE:            "DaSnapE",              //* 关闭快照模式
	DaSnapEResp:        "DaSnapEResp",          //* 关闭快照模式响应
	DaQuit:             "DaQuit",               //* 强制离线
	DpClear:            "DpClear",              //* 终端数据清除
	GrWlan:             "GrWlan",               //* 无线网络配置下发通知
	GrWlanResp:         "GrWlanResp",           //* 无线网络配置下发通知响应
	DpWlan:             "DpWlan",               //* 解除无线网络配置
	DpWlanResp:         "DpWlanResp",           //* 解除无线网络配置响应
	DaSostts:           "DaSostts",             //* SOS告警信息
	DpRestart:          "DpRestart",            //* 终端重启,暂不实现
	DpShudown:          "DpShudown",            //* 终端关机,暂不实现
	GrConfig:           "GrConfig",             //* 参数配置变更通知
	DaRemoteZoom:       "DaRemoteZoom",         //* 终端监控缩放in
	DaRemoteZoomScale:  "DaRemoteZoomScale",    //* 终端监控缩放out
	DaMapNavigation:    "DaMapNavigation",      //* 远程导航经纬度下发
    DaTurnCamera:       'DaVideoCallCamera',    //* 远程视频通话中镜头翻转
    GrFace:             'GrFace',               //* 人脸库变更通知
    GrVehicle:          'GrVehicle',            //* 车牌库变更通知
}
/** 事件上报的数据结构 **/
const data = {
    callType,                                   //* 通话类型
    callState,                                  //* 通话状态
    callEvent,                                  //* 通话事件
    fromUserId: '',
    fromUserName: '',
    isReceive,                                  //* 是否主叫
    members: {userId: member},                  //* 会议成员Map
    updateMembers: {},                          //* 需要更新的会议成员
    mute: false,                                //* 静音
    previewHint: null,
    renderHint: null,
    result: {                                   //* 结果信息可用于提示
        code: '000',
        extra: [],                              //* 额外数据
        msg: '',
    }
    roomId: '',                                 //* 房间号
    statsInfo: {                                //* 通话的统计信息，分辨率，码率，丢包率等信息
        width: 0,
        height: 0,
        bitRate: 0,
        fps: 0,
    },
    toUserId: '',
    toUserName: '',
}
```

# ▶ Media SDK 接口说明

**Version 1.0.0**

## 1 方法

### 1.1 初始化

```javascript
/**
 * 初始化SDK
 * 公有云部署，则申请更换serviceKey，serviceID就可以，Services字段不传
 * 私有云部署，则申请更换serviceKey，serviceID，Services
 * BasicRoomServiceToken路径，根据不同的部署环境，需要手动去更新写死
 * @param {string}   ip        - 信令服务器地址
 * @param {number}   port      - 端口
 * @param {string}   userId    - 当前登录用户的id，带集团码
 * @param {string}   userName  - 当前登录用户的姓名
 * @param {function} fireEvent - 事件上报的回调
 * @param {string}   serviceID - 聚连serviceID
 * @param {string}   serviceKey- 聚连serviceKey
 * @param {string}   Services  - 聚连Token地址
 * @param {string}   videoMonitorRoomId - 视频监控房间号
 * @return {boolean} -成功/失败
 */
initMediaSdk(
  ({
    ip,
    port,
    userId = '',
    userName = '',
    fireEvent = (_) => _,
    serviceID = '',
    serviceKey = '',
    Services = { BasicRoomServiceToken: 'https://ip:port/v1/auth/token' },
    videoMonitorRoomId = '',
  } = {}),
);
```

能且仅能调用一次。

### 1.2 去初始化

```javascript
unInitMediaSdk();
```

### 1.3 是否初始化

```javascript
/**
 * @return {boolean} - 是否初始化
 */
isMediaServiceInit();
```

### 1.4 获取 SDK 版本号

```javascript
/**
 * @return {string}
 */
getSDKVersion();
```

### 1.5 发起通话

```javascript
/**
 * @param {object} callData -数据结构参上
 */
createCall(callData);
```

### 1.6 获取当前通话的统计信息，当前有多少语音通话，多少视频通话，，目前只允许同时发起一种类型的通话

```javascript
/**
 * @return {object}
 * { voice, voiceConf, ptt, tempPtt, broadcast, video, videoConf, forceInsert, forceMonitor }
 * */
getCallStatistics();
```

### 1.7 禁言成员

```javascript
/**
 * @param {string} targetId - 目标id
 * @param {string} targetName - 目标姓名
 * @param {string} dataKey - 房间号
 */
muteMember({ targetId, targetName, dataKey });
```

### 1.8 取消禁言

```javascript
/**
 * @param {string} targetId - 目标id
 * @param {string} targetName - 目标姓名
 * @param {string} dataKey - 房间号
 */
unmuteMember({ targetId, targetName, dataKey });
```

### 1.9 会议成员邀请

```javascript
/**
 * @param {string} targets - 目标id数组
 * @param {string} dataKey - 房间号
 */
inviteMember({ targets, dataKey });
```

### 1.10 会议成员踢出

```javascript
/**
 * @param {string} targets - 目标id数组
 * @param {string} dataKey - 房间号
 */
kickMember({ targets, dataKey });
```

### 1.11 来电接听

```javascript
/**
 * @param {object} callData - 数据结构参上
 */
acceptCall(callData);
```

### 1.12 来电拒接

```javascript
/**
 * @param {object} callData - 数据结构参上
 */
rejectCall(callData);
```

### 1.13 离开语音通话等单人通话

```javascript
/**
 * @param {object} callData - 数据结构参上
 */
leaveCall(callData);
```

### 1.14 销毁会议等群组通话

```javascript
/**
 * @param {object} callData - 数据结构参上
 */
destroyCall(callData);
```

### 1.15 对讲抢话权

```javascript
/**
 * @param {string} dataKey - 房间号
 */
grabSpeak(dataKey);
```

### 1.16 对讲释放话权

```javascript
/**
 * @param {string} dataKey - 房间号
 */
freeSpeak(dataKey);
```

### 1.17 订阅对端流

```javascript
/**
 * @param {object} subData
 */
const subData = {
  videoEle, // 媒体元素
  userID, // 被订阅用户的id
  publishID, // 被订阅用户发布流的id
  layerIndex, // 视频层id-默认为0
  muteAudio, // 禁止音频流
  muteVideo, // 禁止视频流
};
subscribeStream(subData);
```

### 1.18 添加一个终端监控

```javascript
/**
 * @param {array} members - 数据结构参上
 */
addVideoMonitorMember(members);
```

### 1.19 移除一个终端监控

```javascript
/**
 * @param {array} callNos - callNo数组
 */
removeVideoMonitorMember((callNos = []));
```

### 1.20 开始监控语音

```javascript
/**
 * @param {string} callNo - 用户呼叫号，集团码 + 用户id
 */
startVideoMonitorVoice(callNo);
```

### 1.21 结束监控语音

```javascript
/**
 * @param {string} callNo - 用户呼叫号，集团码 + 用户id
 */
stopVideoMonitorVoice(callNo);
```

### 1.21 开始录制流

```javascript
/**
 * @param {string} dataKey - 房间号
 * @param {string} callNo - 需要录制成员的callNo
 */
startRecordStream(dataKey, callNo);
```

### 1.21 结束录制流

```javascript
/**
 ** 仅支持webm格式的文件录制
 * @param {string} dataKey - 房间号
 * @param {string} callNo - 用户callNo
 * @param {string} fileName - 指定文件名
 */
stopRecordStream(dataKey, callNo, fileName);
```

### 1.21 开始录制监控流

```javascript
/**
 * @param {string} callNo - 用户callNo
 */
startRecordMonitorStream(callNo);
```

### 1.21 结束录制监控流

```javascript
/**
 * @param {string} callNo - 用户callNo
 */
stopRecordMonitorStream(callNo);
```

### 1.21 视频通话截图

```javascript
/**
 * @param {string} dataKey - 房间号
 * @param {string} callNo - 用户callNo
 * @param {string} fileName - 指定文件名
 */
captureImage(dataKey, callNo, (fileName = 'no_file_name.png'));
```

### 1.21 视频监控截图

```javascript
/**
 * @param {string} dataKey - 房间号
 * @param {string} callNo - 用户callNo
 * @param {string} fileName - 指定文件名
 */
captureMonitorImage(dataKey, callNo, (fileName = 'no_file_name.png'));
```

### 1.21 远程控制——车牌库更新

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlCarNum(callNo, imei);
```

### 1.21 远程控制——数据清除

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlDataClear(callNo, imei);
```

### 1.21 远程控制——人脸库变更通知

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlFaceChange(callNo, imei);
```

### 1.21 远程控制——强制离线

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlOffline(callNo, imei);
```

### 1.21 远程控制——终端参数变更

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlTmlParam(callNo, imei);
```

### 1.21 远程控制——终端拍照

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlTmlPhoto(callNo, imei);
```

### 1.21 远程控制——开启本地录制

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlTmlRecordStart(callNo, imei);
```

### 1.21 远程控制——结束本地录制

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlTmlRecordStop(callNo, imei);
```

### 1.21 远程控制——终端资源查看

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlTmlRes(callNo, imei);
```

### 1.21 远程控制——画面缩小

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlZoomIn(callNo, imei);
```

### 1.21 远程控制——画面放大

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlZoomOut(callNo, imei);
```

### 1.21 远程控制——摄像头切换

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
remoteCtrlTmlSwitchCamera(callNo, imei);
```

### 1.21 远程控制——自定义控制消息

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} msgType - 消息类型
 * @param {string} imei - 设备识别码
 */
customCtrlMessage(callNo, msgType, imei);
```

### 1.21 远程控制——监控转发

```javascript
/**
 * @param {string} callNo - 用户callNo
 * @param {string} imei - 设备识别码
 */
forwardVideoMonitor(callNo, imei);
```

### 1.21 加入活跃对讲

```javascript
/**
 * @param callData - 数据结构参上
 */
joinPtt(callData);
```
