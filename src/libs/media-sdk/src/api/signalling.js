/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
import { CALL_TYPE, CALL_TYPE_2_RAW_CALL_TYPE, CALL_TYPE_RAW, CONF_RECORD, MEDIA_TRACK, getSocket, getUserData } from '../data/global.data.js';
import { getTimestamp } from '../utils/common.js';
import { Either , curry, pipe, seq, then } from '../utils/functional-utils.js';
import SocketJS from '../utils/socket.js';

const MSG_TYPE = {
    WS_TO_SERVER:   'WsOpToServer',         //* 发向服务端的消息
    WS_TO_CLIENT:   'WsOpToClient',         //* 发向客户端的消息(客户端无用)
    WS_SERVER_DO:   'WsOpServerDoToClient', //* 服务端需要转发给对端
    WS_SERVER_TO:   'WsOpServerToClient',   //* 远程控制
}

export const SIG_TYPE = {
    //! 连接管理
    CONNECT:        'connect',              //* 暂时无用，建立连接（响应：connectack）
    CONNECT_ACK:    'connectack',           //* 【s->c】WebSocket创建成功之后，收到控制服务的回复
    DISCONNECT:     'disconnect',           //* 断开连接（响应：disconnectack）
    DISCON_ACK:     'disconnectack',
    //! 基本指令
    CREATE:         'create',               //* 【c->s】创建群组（响应：creatack）注意: 创建的所有通话都是群组, 语音/视频通话是只有两个终端的群组
    CREATE_ACK:     'createack',            //* 【s->c】创建的回复
    NEW_PEER:       'newpeer',              //* 【s->c】邀请群组成员（响应：joinfinish，加入群组；reject，拒绝加入群组；ring，群组响铃；）
    LEAVE:          'leave',                //* 【c->s】离开群组/本方挂断（响应：leaveack）单个人的离开
    LEAVE_ACK:      'leaveack',             //* 【s->C】
    REJECT:         'reject',               //* 【s<->c】对方拒接
    ACCEPT:         'accept',               //* 【s->c】被叫方接起电话  
    DESTROY:        'destroy',              //* 【c->s】销毁群组（响应：destroyack）全组销毁
    RING:           'ring',                 //* 【s->c】振铃信令
    CANCEL:         'cancel',               //* 【s<->c】取消信令
    OFFER:          'offer',                //* 【c->s】发送offer，创建媒体通道通道（响应：offerack）
    OFFERACK:       'offerack',             //* 【s->c】发送offer，媒体通道创建异常
    ANSWER:         'answer',               //* 【s->c】媒体通道创建成功的answer
    JOIN_FINISH:    'joinfinish',           //* 【c->s】连接完成
    PUBLISH:        'publish',              //* 【s->c】开始创建拉流的PeerConnection
    GRAB:           'grab',                 //* 【c->s】对讲抢话权
    GRAB_ACK:       'graback',              //* 【s->c】抢话失败的响应
    UNMUTE:         'unmute',               //* 【s->c】抢话成功的响应，所有人都会收到
    FREE:           'free',                 //* 【c->s】对讲释放话权
    FREE_ACK:       'freeack',              //* 【s->c】释放话权失败的响应
    MUTE:           'mute',                 //* 【s->c】释放话权成功的响应，所有人都会发
    JOIN_STATE:     'joinstate',            //* 【s->c】群组成员的加入状态
    MONITOR:        'monitor',              //* 【c->s】监控控制信令
    MONITOR_ACK:    'monitorack',           //* 【s->c】监控控制指令响应 

    //! 业务指令
    MESSAGE:        'message',              //* 消息推送：推流，远程控制等
    CALL_OPT:       'callopt',              //* 通话强插，强拆，监听
    GROUP_OPT:      'groupopt',             //* 群组，子指令相关：add，delete，mute，unmute，临时加人，踢人，人员列表查询
    UPDATE_OPT:     'updateopt',            //* 【s->c】控制服务对GROUP_OPT/CALL_OPT的回复

    //! 上下线/对讲组活跃等通知
    NOTIFY_WEB:     'notifyweb',            //* 【s->c】
}

export const CHILD_MSG_TYPE = {
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
    DaFileQuery:        'DaFileQuery',          //* 终端媒体资源查看
    DaShutdown:         'DaShutdown',           //* 关机
    DaReboot:           'DaReboot',             //* 重启
    DaFileUpload:       'DaFileUpload',         //* 文件上传
}

export const GROUP_OPT = {                  //! 子信令
    ADD_MEMBER:     'add',                  //* 添加人员
    DEL_MEMBER:     'delete',               //* 踢人
    MUTE:           'mute',                 //* 对讲静音指令
    UNMUTE:         'unmute',               //* 对讲非静音指令
    CANCEL:         'cancel',               //* 取消语音通话/视频通话
    CHANGE_AUDIO:   'changaudio',           //! 视频转语音，暂时不支持
    QUERY_MEMBERS:  'query',                //* 查询群组成员
    ADD_GROUP:      'addgroup',             //* 添加对讲组
    DEL_GROUP:      'deletegroup',          //* 删除对讲组
    ONLINE:         'online',               //* 对讲组在线人数
}

export const CALL_OPT = {                   //! 子信令
    FORCE_INSERT:   'forceinterposecall',   //* 强插
    FORCE_MONITOR:  'forcemonitorcall',     //* 监听
	FORCE_BREAK:    'forceremovecall',      //* 强拆
}

export const MONITOR_OPT = {
    PUBLISH_VOICE:   'publishvoice',        //* 发布音频
    UNPUBLISH_VOICE: 'unpublishvoice',      //* 取消音频
    isPublish(opt) {
        return opt === this.PUBLISH_VOICE;
    },
    isUnpublish(opt) {
        return opt === this.UNPUBLISH_VOICE;
    }
}

export const MONITOR_TYPE = {
    WEBRTC:           'webrtc',
    RTMP:             'rtmp',
};

export const NOTIFY_TYPE = {
    ONLINE_STATE:      'onlinestate',       //* 终端上下线
    GROUP_ACTIVE:      'groupactive',       //* 对讲组活跃
    isOnlineNotify(type) {
        return type === this.ONLINE_STATE;
    },
    isGroupNotify(type) {
        return type === this.GROUP_ACTIVE;
    }
}

export const ONLINE_STATE = {
    ONLINE:             'online',         //* 上线
    OFFLINE:            'offline',        //* 下线
    isOffline(state) {
        return this.OFFLINE === state;
    }
}

export const ACK_CODE = {
    SUCCESS:                        '000000',   //* 成功
    USER_ID_ILLEGAL:                '100001',   //* 用户ID非法
    USER_NOT_EXIST:                 '100002',   //* 数据库中用户不存在
    CONNECT_EXISTING:               '100003',   //* 连接已存在
    CREATE_RING_FAILED:             '100004',   //* 创建ring失败
    CREATE_PUBLIC_SOURCE_FAILED:    '100011',   //* SRS创建公共源失败
    GET_PTT_MEM_FAILED:             '100012',   //* 对讲组/会议不存在或成员为空
    JOIN_FINISH:                    '100013',   //* 用户已进入join finish状态
    SDP_FAILED:                     '100014',   //* SDP协商失败
    TARGET_NOT_ONLINE:              '100015',   //* 对端不在线
    GRAB_FAILED:                    '100021',   //* 抢话失败
    GRAB_GROUP_NOT_EXIST:           '100022',   //* 抢话的群组不存在
    FREE_GROUP_NOT_EXIST:           '100031',   //* 释放的群组不存在
    success(code) {
        return code === this.SUCCESS;
    }
}

export const ACK_TEXT = (function () {
    const text = {};
    text[ACK_CODE.USER_ID_ILLEGAL]              = '用户ID非法';
    text[ACK_CODE.USER_NOT_EXIST]               = '数据库中用户不存在';
    text[ACK_CODE.CONNECT_EXISTING]             = '连接已存在';
    text[ACK_CODE.CREATE_RING_FAILED]           = '创建ring失败';
    text[ACK_CODE.CREATE_PUBLIC_SOURCE_FAILED]  = 'SRS创建公共源失败';
    text[ACK_CODE.GET_PTT_MEM_FAILED]           = '对讲组/会议不存在或成员为空';
    text[ACK_CODE.JOIN_FINISH]                  = '用户已进入join finish状态';
    text[ACK_CODE.SDP_FAILED]                   = 'SDP协商失败';
    text[ACK_CODE.TARGET_NOT_ONLINE]            = '对端不在线';
    text[ACK_CODE.GRAB_FAILED]                  = '抢话失败';
    text[ACK_CODE.GRAB_GROUP_NOT_EXIST]         = '抢话的群组不存在';
    text[ACK_CODE.FREE_GROUP_NOT_EXIST]         = '释放的群组不存在';
    return text;
})();

const PEER_TYPE = {             //! 除固定对讲/临时对讲之外，其他各个类型的通话，都有发送和接收两个 PeerConnection，对讲只有一个发送的PeerConnection
    SEND:               0,      //* 用于发送的PeerConnection 
    RECEIVE:            1,      //* 用于接收的PeerConnection
    send(type) {
        return this.SEND === type;
    }
}

const REASON = {
    BUSY:               0,      //* 忙
    SIGNAL_ERROR:       1,      //* 信令错误
    PEER_SIGNAL_ERROR:  2,      //* 对端信令错误
    HANG_UP:            3,      //* 挂断
    MEDIA_ERROR:        4,      //* 媒体错误
    PEER_HANG_UP:       5,      //* 对端挂断
    CAMERA_OPEN_ERROR:  6,      //* 相机打开错误
    TIME_OUT:           7,      //* 超时
    TRANSFER:           8,      //* 被转移
    KICK_OUT:           9,      //* 被踢出
    DISSOLUTION:        10,     //* 解散
}

export const PROMPT = {
    VOICE_CREATE_FAILED:        '语音通话创建失败',
    VOICE_CONF_CREATE_FAILED:   '语音会议创建失败',
    PTT_CREATE_FAILED:          '固定对讲创建失败',
    PTT_JOIN_FAILED:            '对讲组加入失败',
    TEMP_PTT_CREATE_FAILED:     '临时对讲创建失败',
    BROADCAST_CREATE_FAILED:    '广播喊话创建失败',
    VIDEO_CREATE_FAILED:        '视频通话创建失败',
    VIDEO_CONF_CREATE_FAILED:   '视频会议创建失败',
    FORCE_INSERT_FAILED:        '强插创建失败',
    FORCE_MONITOR_FAILED:       '监听创建失败',   
}

export const RET_CODE = {
    SUCCESS:            '000',  //* 成功
    SOCKET_BREAKED:     '100',  //* websocket连接断开
    success (code) {
        return this.SUCCESS === code;
    }
}

export const DIRECTION = {
    CALL_IN:            '0',    //* 被叫
    CALL_OUT:           '1',    //* 主叫
    callOut (code) {
        return this.CALL_OUT === code;
    }
}

export function initSignalingService (ip, port, userId, sslEnable, signalingFireEvent = () => {}) {
    const wsUrl = `${sslEnable ? 'wss' : 'ws'}://${ip}:${port}/hl?user_id=${userId}`;
    const fireEvent = curry(socketEvent)(signalingFireEvent);
    const websocket = new SocketJS({ url: wsUrl, protocols: 'hailian-signalling', fireEvent})
                        .connect()
                        .initSocketEvent();
    return Either.of({websocket, wsUrl, ip, port});
}

export function unInitSignallingService() {
    disconnect();
}

function socketEvent (handler, event, data) {
    const handleData = curry(handler)(event);
    Either.of([SocketJS.MESSAGE, SocketJS.ERROR, SocketJS.OPEN, SocketJS.CLOSED].includes(event))
    .map(() => {
        pipe(JSON.parse, handleData)(data);
    });
}

function disconnect() {
    const getMsg = () => createMessage({ sig: SIG_TYPE.DISCONNECT });
    pipe(getMsg, sendMessage)();
}
/**
 ** 发起语音通话
*/
export function voiceCallSignalling(callData) {
    const { toUserId, toUserName } = callData;
    const getMsg = ({toUserId, toUserName}) => createCall({ callType: CALL_TYPE_RAW.VOICE, toUserId, toUserName });
    return pipe(
        getMsg, 
        sendMessage
    )({toUserId, toUserName});
}
/**
 ** 发起语音会议
 */
export function voiceConferenceSignalling(callData) {
    const { conferenceRecord, fromUserId, toUserId, toUserName, members } = callData;
    const memberList = Object.keys(members).concat(fromUserId);
    const getMsg = ({conferenceRecord, toUserId, toUserName, memberList}) => createCall({ callType: CALL_TYPE_RAW.CONFERENCE, conferenceRecord, memberList, toUserId, toUserName });
    return pipe(
        getMsg, 
        sendMessage
    )({conferenceRecord, toUserId, toUserName, memberList});
}
/**
 ** 发起固定对讲
 */
export function pttSignalling(callData) {
    const {fromUserId, roomId, toUserName, members } = callData;
    const memberList = Object.keys(members);
    !memberList.includes(fromUserId) && memberList.push(fromUserId); 
    const getMsg = ({roomId, toUserName, memberList}) => createCall({ callType: CALL_TYPE_RAW.PTT, memberList, monitorGroup: [roomId], roomId, toUserId: roomId, toUserName });
    return pipe(
        getMsg, 
        msg => (msg.needCall = '1', msg),
        sendMessage
    )({roomId, toUserName, memberList});
}
/**
 ** 发起临时对讲
 */
export function tempPttSignalling(callData) {
    const { fromUserId, toUserId, toUserName, members } = callData;
    const memberList = Object.keys(members);
    !memberList.includes(fromUserId) && memberList.push(fromUserId);
    const getMsg = ({toUserId, toUserName, memberList}) => createCall({ callType: CALL_TYPE_RAW.TEMP_PTT, memberList, toUserId, toUserName });
    return pipe(
        getMsg, 
        sendMessage
    )({toUserId, toUserName, memberList});
}
/**
 ** 发起广播喊话
 */
export function broadcastSignalling(callData) {
    const { fromUserId ,toUserId, toUserName, members } = callData;
    const memberList = Object.keys(members).concat(fromUserId);
    const getMsg = ({toUserId, toUserName, memberList}) => createCall({ callType: CALL_TYPE_RAW.BROADCAST, memberList, toUserId, toUserName });
    return pipe(
        getMsg, 
        sendMessage
    )({toUserId, toUserName, memberList});
}
/**
 ** 发起视频通话
 */
export function videoCallSignalling(callData) {
    const { toUserId, toUserName } = callData;
    const getMsg = ({toUserId, toUserName}) => createCall({ audioOnly: MEDIA_TRACK.VIDEO_AUDIO, callType: CALL_TYPE_RAW.VOICE, toUserId, toUserName });
    return pipe(
        getMsg, 
        sendMessage
    )({toUserId, toUserName});
}
/**
 ** 发起视频会议
 */
export function videoConferenceSignalling(callData) {
    const { conferenceRecord, fromUserId, toUserId, toUserName, members } = callData;
    const memberList = Object.keys(members).concat(fromUserId);
    const getMsg = ({conferenceRecord, toUserId, toUserName}) => createCall({ 
        conferenceRecord,
        audioOnly: MEDIA_TRACK.VIDEO_AUDIO, 
        callType: CALL_TYPE_RAW.CONFERENCE, 
        toUserId, toUserName, 
        memberList
    });
    return pipe(
        getMsg, 
        sendMessage
    )({conferenceRecord, toUserId, toUserName});
}
/**
** 开启视频监控 
*/
export function startVideoMonitorSignalling(members) {
    const getMsg = ({callNo, imei, localRecord}) => createCtrlMsg({childMsgType: localRecord ? CHILD_MSG_TYPE.DaRecordAndMonitor : CHILD_MSG_TYPE.DaRtmpS, destId: callNo, devid: imei});
    const rets = {};
    Object.values(members || {}).forEach(({callNo, imei, localRecord}) => {
        const ret = pipe(
            getMsg,
            sendMessage
        )({callNo, imei, localRecord});
        rets[callNo] = ret;
    });
    return rets;
}

export function stopVideoMonitorSignalling(callNo) {
    const getMsg = ({callNo}) => createCtrlMsg({childMsgType: CHILD_MSG_TYPE.DaRtmpE, destId: callNo});
    return pipe(
        getMsg,
        sendMessage
    )({callNo});
}
/**
** callNo: 被转发人的Id
** target：要转发给谁的id
*/
export function forwardVideoMonitorSignalling(callNo, target, type = MONITOR_TYPE.WEBRTC, url = '') {
    const getMsg = ({callNo, target, type, url}) => createCtrlMsg({childMsgType: CHILD_MSG_TYPE.DaRtmpP, destId: target, devid: target, rtmpDest: callNo, type, url});
    return pipe(
        getMsg,
        sendMessage
    )({callNo, target, type, url});
}

export function startMonitorVoiceSignalling(toUserId) {
    const getMsg = ({toUserId}) => createMessage({memberList: [toUserId], msgType: MSG_TYPE.WS_SERVER_DO, sig: SIG_TYPE.MONITOR, toUserId, type: MONITOR_OPT.PUBLISH_VOICE});
    return pipe(
        getMsg,
        sendMessage
    )({toUserId});
}

export function stopMonitorVoiceSignalling(toUserId) {
    const getMsg = ({toUserId}) => createMessage({memberList: [toUserId], msgType: MSG_TYPE.WS_SERVER_DO, sig: SIG_TYPE.MONITOR, toUserId, type: MONITOR_OPT.UNPUBLISH_VOICE});
    return pipe(
        getMsg,
        sendMessage
    )({toUserId});
}

export function remoteCtrlSignalling(callNo, childMsgType, imei, extra = {}) {
    const getMsg = ({callNo, childMsgType, imei, extra}) => createCtrlMsg({childMsgType, destId: callNo, devid: imei, extra});
    return pipe(
        getMsg,
        sendMessage
    )({callNo, childMsgType, imei, extra});
}

export function sendCustomMessage(content, destId) {
    const getMsg = ({content, destId}) => createCustomMsg({content, destId});
    return pipe(
        getMsg,
        sendMessage
    )({content, destId});
}

/**
 ** 发送offer
*/
function offerSignalling(callData, offer, peerId) {
    const { callType, roomId, toUserId, toUserName } = callData;
    const getMsg = ({toUserId, toUserName}) => createMessage({ callType, sig: SIG_TYPE.OFFER, peerId, roomId, sdp: offer.sdp, toUserId, toUserName });
    return pipe(
        getMsg, 
        sendMessage
    )({toUserId, toUserName});
}
/**
 ** 发送Receive PeerConnection的offer
*/
export function recvOfferSignalling(callData, offer, peerId) {
    return offerSignalling(callData, offer, peerId);    
}
/**
 ** 发送Send PeerConnection的offer
 */
export function sendOfferSignalling(callData, offer) {
    const sendOffer = curry(offerSignalling)(callData, offer);
    return pipe(
        getSendPeerId, 
        sendOffer
    )({callData, peerType: PEER_TYPE.SEND})
}
/**
 ** 仅 Send PeerConnection 使用
 */
function getSendPeerId({callData, peerType}) {
    return [CALL_TYPE.PTT, CALL_TYPE.TEMP_PTT].includes(callData.callType) ?
        callData.toUserId :
            peerType === PEER_TYPE.SEND ?
            callData.roomId :
            '';
}
/**
 ** 每收到一个 SIG_TYPE.ANSWER 信令，就需要发送一个 SIG_TYPE.JOIN_FINISH 信令
*/
export function sendJoinFinish(callData) {
    const { callType, roomId, toUserId, toUserName } = callData;
    const getMsg = ({callType, roomId, toUserId, toUserName}) => createMessage({ callType, sig: SIG_TYPE.JOIN_FINISH, roomId, toUserId, toUserName });
    return pipe(
        formatType,
        getMsg, 
        sendMessage
    )({callType, roomId, toUserId, toUserName});
}

export function accept(callData) {
    const { callType, roomId, fromUserId, fromUserName } = callData;
    
    const getMsg = ({callType, roomId, fromUserId, fromUserName}) => 
        createMessage({
            callType, 
            msgType: MSG_TYPE.WS_SERVER_DO, 
            roomId, 
            sig: SIG_TYPE.ACCEPT, 
            toUserId: fromUserId, 
            toUserName: fromUserName
        })
    
    pipe(
        formatType,
        getMsg, 
        sendMessage
    )({callType, roomId, fromUserId, fromUserName})
}

/**
 ** 禁言/抢话
 */
export function mute(targetId, targetName, callData) {
    const { callType, roomId } = callData;
    const getMsg = ({
        callType, 
        roomId, 
        toUserId, 
        toUserName
    }) => createMessage({ callType, sig: SIG_TYPE.GROUP_OPT, roomId, toUserId, toUserName, type: GROUP_OPT.MUTE });
    return pipe(
        formatType,
        getMsg, 
        sendMessage
    )({callType, roomId, toUserId: targetId, toUserName: targetName});
}
/**
 ** 取消禁言/释放话权
 ** targetId/targetName 需要禁言的id/名字
 */
export function unmute(targetId, targetName, callData) {
    const { callType, roomId } = callData;
    const getMsg = ({
        callType, 
        roomId, 
        toUserId, 
        toUserName
    }) => createMessage({ 
        callType, 
        sig: SIG_TYPE.GROUP_OPT, 
        roomId, 
        toUserId, 
        toUserName, 
        type: GROUP_OPT.UNMUTE 
    });
    return pipe(
        formatType,
        getMsg, 
        sendMessage
    )({callType, roomId, toUserId: targetId, toUserName: targetName});
}
/**
 ** 邀请成员
 ** targetIds: [ '9999010003', '9999010005' ]
*/
export function invite(targetIds, callData) {
    const {
        audioOnly, 
        callType, 
        roomId,
        toUserId,
        toUserName
    } = callData;
    const getMsg = ({
        audioOnly,
        callType, 
        memberList,
        roomId, 
        toUserId, 
        toUserName,
    }) => createMessage({ 
        audioOnly, 
        callType, 
        memberList, 
        sig: SIG_TYPE.GROUP_OPT, 
        roomId, 
        toUserId, 
        toUserName, 
        type: GROUP_OPT.ADD_MEMBER 
    });
    return pipe(
        formatType,
        getMsg, 
        sendMessage
    )({audioOnly, callType, memberList: targetIds, roomId, toUserId, toUserName});
}

export function invitePtt(targetId, roomId) {
    const getMsg = ({ 
        memberList,
        toUserId,
        roomId, 
    }) => createMessage({ 
        callType: CALL_TYPE_RAW.PTT, 
        memberList, 
        msgType: MSG_TYPE.WS_TO_CLIENT,
        sig: SIG_TYPE.GROUP_OPT, 
        roomId, 
        toUserId, 
        type: GROUP_OPT.ADD_MEMBER 
    });
    return pipe(
        getMsg, 
        sendMessage
    )({memberList: [targetId], toUserId: targetId, roomId});
}

export function inviteTempPtt(targetId, roomId) {
    const getMsg = ({ 
        memberList,
        toUserId,
        roomId, 
    }) => createMessage({ 
        callType: CALL_TYPE_RAW.TEMP_PTT, 
        memberList, 
        msgType: MSG_TYPE.WS_TO_CLIENT,
        sig: SIG_TYPE.GROUP_OPT, 
        roomId, 
        toUserId, 
        type: GROUP_OPT.ADD_MEMBER 
    });
    return pipe(
        getMsg, 
        sendMessage
    )({memberList: [targetId], toUserId: targetId, roomId});
}

export function kick(targetIds, callData) {
    const {
        audioOnly, 
        callType,
        roomId,
        toUserId,
        toUserName 
    } = callData;
    const getMsg = ({
        audioOnly, 
        callType, 
        memberList,
        roomId, 
        toUserId, 
        toUserName,
    }) => createMessage({ 
        audioOnly, 
        callType, 
        memberList, 
        msgType: MSG_TYPE.WS_TO_CLIENT,
        sig: SIG_TYPE.GROUP_OPT, 
        roomId, 
        toUserId, 
        toUserName, 
        type: GROUP_OPT.DEL_MEMBER 
    });
    return pipe(
        formatType,
        getMsg, 
        sendMessage
    )({audioOnly, callType, memberList: targetIds, roomId, toUserId, toUserName });
}

export function kickPtt(targetId, roomId) {
    const getMsg = ({
        memberList,
        toUserId,
        roomId
    }) => createMessage({ 
        callType: CALL_TYPE_RAW.PTT, 
        memberList, 
        msgType: MSG_TYPE.WS_TO_CLIENT,
        sig: SIG_TYPE.GROUP_OPT, 
        roomId, 
        toUserId,  
        type: GROUP_OPT.DEL_MEMBER 
    });
    return pipe(
        getMsg, 
        sendMessage
    )({ memberList: [targetId], toUserId: targetId, roomId });
}

export function kickTempPtt(targetId, roomId) {
    const getMsg = ({
        memberList,
        toUserId,
        roomId
    }) => createMessage({ 
        callType: CALL_TYPE_RAW.TEMP_PTT, 
        memberList, 
        msgType: MSG_TYPE.WS_TO_CLIENT,
        sig: SIG_TYPE.GROUP_OPT, 
        roomId, 
        toUserId,  
        type: GROUP_OPT.DEL_MEMBER 
    });
    return pipe(
        getMsg, 
        sendMessage
    )({ memberList: [targetId], toUserId: targetId, roomId });
}

/**
 ** 查询群组内的成员 
 */
export function queryMembers(callData) {
    const { 
        audioOnly, 
        callType, 
        roomId, 
        toUserId, 
        toUserName 
    } = callData;
    const getMsg = ({
        audioOnly, 
        callType, 
        roomId, 
        toUserId, 
        toUserName
    }) => createMessage({ 
        audioOnly, 
        callType, 
        sig: SIG_TYPE.GROUP_OPT, 
        roomId, 
        toUserId, 
        toUserName, 
        type: GROUP_OPT.QUERY_MEMBERS 
    });
    pipe(
        formatType,
        getMsg, 
        sendMessage
    )({audioOnly, callType, roomId, toUserId, toUserName});
}

export function addPtt(callData) {
    const { 
        callType, 
        members,
        roomId, 
        toUserId, 
        toUserName 
    } = callData;
    const memberList = Object.keys(members);
    const getMsg = ({
        callType, 
        memberList, 
        roomId, 
        toUserId, 
        toUserName
    }) => createMessage({ 
        callType, 
        memberList,
        sig: SIG_TYPE.GROUP_OPT, 
        roomId, 
        toUserId, 
        toUserName, 
        type: GROUP_OPT.ADD_GROUP 
    });
    pipe(
        formatType,
        getMsg, 
        sendMessage
    )({callType, memberList, roomId, toUserId, toUserName});
}

export function delPtt(callData) {
    const { 
        callType, 
        members,
        roomId, 
        toUserId, 
        toUserName 
    } = callData;
    const memberList = Object.keys(members);
    const getMsg = ({
        callType, 
        memberList, 
        roomId, 
        toUserId, 
        toUserName
    }) => createMessage({ 
        callType, 
        memberList,
        sig: SIG_TYPE.GROUP_OPT, 
        roomId, 
        toUserId, 
        toUserName, 
        type: GROUP_OPT.DEL_GROUP 
    });
    pipe(
        formatType,
        getMsg, 
        sendMessage
    )({callType, memberList, roomId, toUserId, toUserName});
}
/**
 ** 抢话 
 */
export function grab(callData) {
    const { 
        callType, 
        roomId, 
        toUserId, 
        toUserName 
    } = callData;
    const getMsg = ({
        callType, 
        roomId, 
        toUserId, 
        toUserName
    }) => createMessage({ 
        callType, 
        roomId, 
        sig: SIG_TYPE.GRAB, 
        toUserId, 
        toUserName, 
    });
    pipe(
        formatType,
        getMsg, 
        sendMessage
    )({callType, roomId, toUserId, toUserName});
}
/**
 ** 释放话权
 */
export function free(callData) {
    const { 
        callType, 
        roomId, 
        toUserId, 
        toUserName 
    } = callData;
    const getMsg = ({
        callType, 
        roomId, 
        toUserId, 
        toUserName
    }) => createMessage({ 
        callType,  
        roomId, 
        sig: SIG_TYPE.FREE, 
        toUserId, 
        toUserName, 
    });
    pipe(
        formatType,
        getMsg, 
        sendMessage
    )({callType, roomId, toUserId, toUserName});
}

/**
 ** 强拆 
 */
export function forceRemove(callData) {
    const { toUserId, toUserName } = callData;
    const getMsg = ({ toUserId, toUserName }) => 
        createMessage({ callType: CALL_TYPE_RAW.VOICE, sig: SIG_TYPE.CALL_OPT, toUserId, toUserName, type: CALL_OPT.FORCE_BREAK });
    pipe(
        getMsg,
        sendMessage
    )({ toUserId, toUserName });
}

/**
 ** 强插
 */
export function forceInterpose(callData) {
    const { toUserId, toUserName } = callData;
    const getMsg = ({ toUserId, toUserName }) => 
        createMessage({ callType: CALL_TYPE_RAW.VOICE, sig: SIG_TYPE.CALL_OPT, toUserId, toUserName, type: CALL_OPT.FORCE_INSERT });
    return pipe(
        getMsg,
        sendMessage
    )({ toUserId, toUserName });
}

/**
 ** 监听
 */
 export function forceMonitor(callData) {
    const { toUserId, toUserName } = callData;
    const getMsg = ({ toUserId, toUserName }) => 
        createMessage({ callType: CALL_TYPE_RAW.VOICE, sig: SIG_TYPE.CALL_OPT, toUserId, toUserName, type: CALL_OPT.FORCE_MONITOR });
    return pipe(
        getMsg,
        sendMessage
    )({ toUserId, toUserName });
}
/**
 ** 通话主动挂断
 */
export function leave(callData) {
    const { audioOnly, callType, fromUserId, fromUserName, isReceive, roomId, toUserId, toUserName } = callData;
    const   toId = isReceive ? fromUserId : toUserId;
    const toName = isReceive ? fromUserName : toUserName;
    const getMsg = ({audioOnly, callType, roomId, toUserId, toUserName}) => {
        let msg = createMessage({ audioOnly, callType, sig: SIG_TYPE.LEAVE, roomId, toUserId, toUserName, msgType: MSG_TYPE.WS_SERVER_DO });
        msg.reason = REASON.HANG_UP;
        return msg;
    };
    return pipe(
        formatType,
        getMsg, 
        sendMessage
    )({audioOnly, callType, roomId, toUserId: toId, toUserName: toName});
}
/**
 ** 主动创建会议/对讲/喊话，离开要发destroy
 */
export function destroy(callData) {
    const { audioOnly, callType, roomId, toUserId, toUserName } = callData;
    const getMsg = ({ audioOnly, callType, roomId, toUserId, toUserName }) =>
            createMessage({audioOnly, callType, msgType: MSG_TYPE.WS_SERVER_DO, roomId, sig: SIG_TYPE.DESTROY, toUserId, toUserName});
    return pipe(
        formatType,
        getMsg,
        sendMessage
    )({ audioOnly, callType, roomId, toUserId, toUserName });
}

export function reject(callData) {
    const { audioOnly, callType, roomId, fromUserId, fromUserName } = callData;
    const getMsg = ({audioOnly, callType, roomId, fromUserId, fromUserName}) => {
        let msg = createMessage({
            audioOnly, 
            callType, 
            sig: SIG_TYPE.REJECT, 
            roomId, 
            toUserId: fromUserId, 
            toUserName: fromUserName, 
            msgType: MSG_TYPE.WS_SERVER_DO 
        });
        msg.reason = REASON.BUSY;
        return msg;
    };
    return pipe(
        formatType,
        getMsg, 
        sendMessage
    )({audioOnly, callType, roomId, fromUserId, fromUserName});
}

function sendMessage(msg) {
    const socket = getSocket();
    const ret = Either.of(socket)
    .map((socket) => socket.send(msg))
    .unwrap();
    return ret;
}

function createCall({
    audioOnly = MEDIA_TRACK.AUDIO_ONLY,
    conferenceRecord = CONF_RECORD.NON,
    callType = '',
    memberList = [],
    monitorGroup = [],
    roomId = '000000',
    toUserId = '',
    toUserName = '',
} = {}) {
    const sig = SIG_TYPE.CREATE;
    const msgType = MSG_TYPE.WS_TO_SERVER;
    return createMessage({ audioOnly, callType, conferenceRecord, memberList, monitorGroup, msgType, roomId, sig, toUserId, toUserName })
}

function createMessage ({
    audioOnly = MEDIA_TRACK.AUDIO_ONLY,
    callType = '',
    conferenceRecord = CONF_RECORD.NON,
    fromUserId = '',
    fromUserName = '',
    memberList = [],
    monitorGroup = [],
    msgType = MSG_TYPE.WS_TO_SERVER,
    peerId = '',
    roomId = '000000',
    sdp = '',
    sig,
    toUserId = '',
    toUserName = '',
    type = '',
} = {}) {
    const { userId, userName } = getUserData();
    const uid = userId;
    fromUserId = fromUserId || uid;
    fromUserName = fromUserName || userName;
    const ts = getTimestamp() + '';
    return {
        audioOnly,          //! '1'-仅音频，'0'-同时音视频。视频通话：callType=voice 且 audioOnly = '0'
        callType,           //* voice: 普通通话, ptt: 固定对讲<需要携带对讲组号>, tempptt: 临时对讲, conference: 会议, shout: 喊话.
        conferenceRecord,   //* 会议是否录制，1:录制，0:不录制
        fromUserId,         //* 语音或视频会议，该字段为发起者的号码
        fromUserName,       //* 语音或视频会议，该字段为发起者的名称
        memberList,         //* 临时对讲或者会议，需要呼叫的成员数组
        monitorGroup,       //* 要发起的固定对讲的id数组
        msgType,            //* 消息的方向。由 s -> c 或者 c -> s 
        peerId,             //! 1.对讲临时对讲仅一个PeerConnection使用toUserId作为peerId。2.语音或者会议有两个PeerConnection, send的peer使用roomId，receive的peer使用toUserId
        roomId,             //* 此时没有生成，只为了便于处理 此时默认填写"000000"
        sdp,                //* 会话描述
        sig,                //* 业务指令
        toUserId,           //* callType为ptt|tmpptt，对讲组号；callType为voice，目标用户ID，callType为conference，会议ID
        toUserName,         //* callType为ptt|tmpptt，对讲组名称；callType为voice，目标用户名称。callType为conference，会议名称
        ts,                 //* 时间戳
        type,               //* 添加/踢人等群组操作
        uid,                //* 登录用户id
    }
}

function createCtrlMsg({
    childMsgType = '',
    destId       = '',
    devid        = '',
    rtmpDest     = '',
    type         = MONITOR_TYPE.WEBRTC,
    extra        = {},
} = {}) {
    const { userId } = getUserData();
    const ts = getTimestamp();
    return {
        childMsgType,
        destId,
        devid,
        msgType: MSG_TYPE.WS_SERVER_TO,
        rtmpDest,
        sig: SIG_TYPE.MESSAGE,
        srcId: userId,
        ts,
        type,
        ...extra
    }
}

function createCustomMsg({
    content = '',
    destId  = '',
} = {}) {
    const { userId } = getUserData();
    const ts = getTimestamp();
    return {
        content,
        destId,
        msgType: MSG_TYPE.WS_SERVER_DO,
        sig: SIG_TYPE.MESSAGE,
        srcId: userId,
        ts,
    }
}

/**
** 转换 
*/
function formatType(callData) {
    const oriType = callData.callType;
    const hasType = callData => !!callData.callType;
    const  noType = callData => !callData.callType;
    const trsType = callData => callData.callType = CALL_TYPE_2_RAW_CALL_TYPE[callData.callType];
    const restore = callData => callData.callType = oriType;
    //! 存在callType，则进行转换到信令服务器的callType, 转换失败则还原最初的callType
    then(
        hasType,
        seq(
            trsType,
            then(
                noType,
                restore
            )
        )
    )(callData);
    return callData;
}