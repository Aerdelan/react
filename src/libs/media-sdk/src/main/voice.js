/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
import { 
    PROMPT,
    RET_CODE, 
    broadcastSignalling, 
    forceInterpose, 
    forceMonitor, 
    forceRemove, 
    invite, 
    pttSignalling,  
    tempPttSignalling, 
    voiceCallSignalling, 
    voiceConferenceSignalling 
} from "../api/signalling.js";
import { 
    MEDIA_TRACK,
    insertCallData, 
    fireStateEvent,
    callStateFailed,
    deleteCallData,
    fireCallArrive,
    getDataKey,
    generateCallData,
    rawCallType2CallTye,
    CALL_TYPE,
    CALL_STATE,
    setMediaElement,
    getUserData,
    generateConfMem
} from "../data/global.data.js";
import { identity, pipe } from "../utils/functional-utils.js";

const  ifFailedState = (success, dataKey, result) =>
                        success ? 
                            identity:
                            callStateFailed(dataKey, result);

const  delFailedData = (success, dataKey) => 
                    success ? identity : deleteCallData(dataKey);

/**
** 发起语音通话, **callData**上层业务已经转换为SDK认可的数据结构
**   1. 发送create信令
**   2. 保存数据
**   3. 改变状态为RING/FAILED
**   4. 触发事件，通知上层业务
*/
export function createVoiceCall(callData) {
    const         dataKey = getDataKey(callData);
    const { code, error } = voiceCallSignalling(callData);
    const         success = RET_CODE.success(code);
    const          result = { code, msg: PROMPT.VOICE_CREATE_FAILED, error };
    pipe(
        insertCallData,
        ifFailedState(success, dataKey, result),
        fireStateEvent(dataKey),
        delFailedData(success, dataKey)
    )(callData);
}

export function createVoiceConference(callData) {
    const         dataKey = getDataKey(callData);
    const { code, error } = voiceConferenceSignalling(callData);
    const         success = RET_CODE.success(code);
    const          result = {code, msg: PROMPT.VOICE_CONF_CREATE_FAILED, error};
    pipe(
        insertCallData, 
        ifFailedState(success, dataKey, result),
        fireStateEvent(dataKey),
        delFailedData(success, dataKey)
    )(callData);
}

export function createPtt(callData) {
    const         dataKey = getDataKey(callData);
    const { code, error } = pttSignalling(callData);
    const         success = RET_CODE.success(code);
    const          result = { code, msg: PROMPT.PTT_CREATE_FAILED, error };
    pipe(
        insertCallData, 
        ifFailedState(success, dataKey, result),
        fireStateEvent(dataKey),
        delFailedData(success, dataKey)
    )(callData);
}

export function joinActivePtt(callData) {
    const         dataKey = getDataKey(callData);
    const { code, error } = invite(callData.callNo, callData);
    const         success = RET_CODE.success(code);
    const          result = { code, msg: PROMPT.PTT_JOIN_FAILED, error };
    pipe(
        insertCallData, 
        ifFailedState(success, dataKey, result),
        fireStateEvent(dataKey),
        delFailedData(success, dataKey)
    )(callData);
}

export function createTempPtt(callData) {
    const         dataKey = getDataKey(callData);
    const { code, error } = tempPttSignalling(callData);
    const         success = RET_CODE.success(code);
    const          result = { code, msg: PROMPT.TEMP_PTT_CREATE_FAILED, error };
    pipe(
        insertCallData, 
        ifFailedState(success , dataKey, result),
        fireStateEvent(dataKey),
        delFailedData(success, dataKey)
    )(callData);
}

export function createBroadcast(callData) {
    const         dataKey = getDataKey(callData);
    const { code, error } = broadcastSignalling(callData);
    const         success = RET_CODE.success(code);
    const          result = { code, msg: PROMPT.BROADCAST_CREATE_FAILED, error };
    pipe(
        insertCallData, 
        ifFailedState(success, dataKey, result),
        fireStateEvent(dataKey),
        delFailedData(success, dataKey)
    )(callData);
}

export function forceInsertCall(callData) {
    const         dataKey = getDataKey(callData);
    const { code, error } = forceInterpose(callData);
    const         success = RET_CODE.success(code);
    const          result = { code, msg: PROMPT.BROADCAST_CREATE_FAILED, error };
    pipe(
        insertCallData,
        ifFailedState(success, dataKey, result),
        fireStateEvent(dataKey),
        delFailedData(success, dataKey)
    )(callData);
}

export function forceMonitorCall(callData) {
    const         dataKey = getDataKey(callData);
    const { code, error } = forceMonitor(callData);
    const         success = RET_CODE.success(code);
    const          result = { code, msg: PROMPT.BROADCAST_CREATE_FAILED, error };
    pipe(
        insertCallData,
        ifFailedState(success, dataKey, result),
        fireStateEvent(dataKey),
        delFailedData(success, dataKey)
    )(callData);
}

export function forceBreakCall(callData) {
    forceRemove(callData);
}

/**
 ** 语音通话呼入
*/
export function voiceCallIn(data) {
    const { fromUserId, fromUserName, roomId, toUserId, toUserName } = data;
    const callType = rawCallType2CallTye(data);
    const    isPtt = CALL_TYPE.isPttAll(callType);
    const  isAConf = CALL_TYPE.isVoiceConf(callType);
    const  members = {};
    const  {userId, userName} = getUserData();
    //* 对讲成员默认处于禁言状态
    (isAConf || isPtt) && (
        members[fromUserId] = generateConfMem({ callNo: fromUserId, mute: isPtt, name: fromUserName, isHost: true }),
        members[userId] = generateConfMem({ callNo: userId, mute: isPtt, name: userName })
    )
    const callData = generateCallData({
        audioOnly: MEDIA_TRACK.AUDIO_ONLY,
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
        fireCallArrive(dataKey),
    )(callData);
}

export function setAudioElement({dataKey, renderHint}) {
    setMediaElement(dataKey, renderHint);
}