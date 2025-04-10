/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
import {
    MONITOR_TYPE,
    PROMPT, 
    RET_CODE,  
    forwardVideoMonitorSignalling,  
    startMonitorVoiceSignalling,  
    startVideoMonitorSignalling,  
    stopMonitorVoiceSignalling,  
    stopVideoMonitorSignalling,  
    videoCallSignalling, 
    videoConferenceSignalling
} from "../api/signalling.js";
import { 
    MEDIA_TRACK,
    CALL_TYPE,
    callStateFailed, 
    callStateRing, 
    deleteCallData, 
    fireCallArrive, 
    fireStateEvent, 
    generateCallData, 
    getDataKey, 
    insertCallData, 
    rawCallType2CallTye,
    setPreviewElement,
    setMediaElement,
    generateConfMem,
    getUserData,
    callStateHold,
    addConfMember,
    getVideoMonitorRoomId,
    delConfMember,
    getCallData,
    CALL_STATE,
    callStateIdle,
    resetMemMediaEle,
    getDefaultDevices
} from "../data/global.data.js";
import { identity, ifElse, pipe, then } from "../utils/functional-utils.js";
import { joinMonitorRoom, leaveMonitorRoom, muteMonitorLocalA, previewMonitorStart, selectMonitorAudioDevices } from "../webrtc/hirtc.js";

const changeCallState = (success, dataKey, result) =>  
                        success ? 
                            callStateRing(dataKey):
                            callStateFailed(dataKey, result);

const ifFailed = (success, dataKey) => success ? identity : deleteCallData(dataKey);

export function createVideoCall(callData) {
    const         dataKey = getDataKey(callData);
    const { code, error } = videoCallSignalling(callData);
    const         success = RET_CODE.success(code);
    const          result = { code, error, msg: PROMPT.VIDEO_CREATE_FAILED };
    pipe(
        insertCallData,
        changeCallState(success, dataKey, result),
        fireStateEvent(dataKey),
        ifFailed(success, dataKey)
    )(callData);
}

export function createVideoConference(callData) {
    const         dataKey = getDataKey(callData);
    const { code, error } = videoConferenceSignalling(callData);
    const         success = RET_CODE.success(code);
    const          result = { code, error, msg: PROMPT.VIDEO_CONF_CREATE_FAILED };
    pipe(
        insertCallData,
        changeCallState(success, dataKey, result),
        fireStateEvent,
        ifFailed(success, dataKey)
    )(callData);
}
/**
*! 视频监控作为一个固定的大房间，不同调度员拉起的所有的被监控终端都加入一个固定的房间。
*! 房间号采用一个的固定的roomId。
*/
export function insertVideoMonitorData(callData) {
    const { userId, userName } = getUserData();
    const roomId = getVideoMonitorRoomId();
    const format = callData => {
        callData.callState = CALL_STATE.IDLE;
        callData.roomId = roomId;
        callData.fromUserId = userId;
        callData.fromUserName = userName;
        return callData;
    };
    //* 初始默认为空闲状态
    pipe(
        format,
        insertCallData
    )(callData);
}

export function createVideoMonitor(callData) {
    const monitorData = pipe(getVideoMonitorRoomId, getCallData)();
    //! 已经存在视频监控, 直接拉人
    ifElse(
        !!monitorData,
        ({members}) => addVideoMonitorMember(members),
        initVideoMonitor
    )(callData);
}

function initVideoMonitor(callData) {
    const        { members } = callData;
    const            dataKey = getVideoMonitorRoomId();
    const    changeStateHold = callStateHold(dataKey);
    const {userId, userName} = getUserData();
    insertVideoMonitorData(callData);
    //* 存在监控时，状态变为线路保持
    changeStateHold();
    startVideoMonitorSignalling(members);
    Object.values(members).forEach(member => addConfMember(dataKey, member));
    pipe(
        getDefaultDevices,
        selectMonitorAudioDevices,
        previewMonitorStart
    )();
    joinMonitorRoom({ callData: getCallData(dataKey), userID: userId, userName });
}

export function addVideoMonitorMember(members = []) {
    const dataKey = getVideoMonitorRoomId();
    startVideoMonitorSignalling(members);
    Object.values(members).forEach(member => addConfMember(dataKey, member));
}

export function videoMonitorRetrying(member) {
    startVideoMonitorSignalling([member]);
}

export function removeVideoMonitorMember(callNos = []) {
    const dataKey = getVideoMonitorRoomId();
    callNos.forEach((callNo) => {
        resetMemMediaEle(dataKey, callNo);
        delConfMember(dataKey, [callNo]);
        stopVideoMonitorSignalling(callNo);
    });
    const { members } = getCallData(dataKey);
    //* 无人监控后，离开房间，删除数据
    then(
        Object.keys(members || {}).length === 0,
        pipe(
            leaveMonitorRoom(dataKey),
            deleteCallData(dataKey)
        )
    )();
}

export function startVideoMonitorVoice(callNo) {
    muteMonitorLocalA({ muteAudio: false });
    startMonitorVoiceSignalling(callNo);
}

export function stopVideoMonitorVoice(callNo) {
    stopMonitorVoiceSignalling(callNo);
    // muteMonitorLocalA({ muteAudio: true });
}

export function forwardVideoMonitor(callNo, target, type = MONITOR_TYPE.WEBRTC, url = '') {
    forwardVideoMonitorSignalling(callNo, target, type, url);
}

export function videoCallIn(data) {
    const { fromUserId, fromUserName, roomId, toUserId, toUserName } = data;
    const callType = rawCallType2CallTye(data);
    const  isVConf = CALL_TYPE.isVideoConf(callType);
    const  members = {};
    const  {userId, userName} = getUserData();
    isVConf && (
        members[fromUserId] = generateConfMem({ callNo: fromUserId, mute: false, name: fromUserName, isHost: true }),
        members[userId] = generateConfMem({ callNo: userId, mute: false, name: userName })
    )
    const callData = generateCallData({
        audioOnly: MEDIA_TRACK.VIDEO_AUDIO,
        callType,
        fromUserId,
        fromUserName,
        isReceive: true,
        members, 
        roomId,
        toUserId,
        toUserName,
    });
    const dataKey = getDataKey(callData);
    
    pipe(
        insertCallData,
        callStateRing(dataKey),
        fireCallArrive(dataKey),
    )(callData);
}

export function setVideoElement({ dataKey, renderHint, previewHint }) {
    setPreviewElement(dataKey, previewHint); 
    setMediaElement(dataKey, renderHint);
}