/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
import { deepCopy } from "../utils/common.js";
import { identity, and, curry, functionalize, pipe, seq, cond, ifElse, fnError } from "../utils/functional-utils.js";
/*
callData采用兼容的旧数据结构:
{
    callType,
    callState,
    callEvent,
    confNum,
    confName,
    fromUserId: '',
    fromUserName: '',
    isReceive,                              //* 主叫被叫
    members: {userId: member},              //* 会议成员Map
    updateMembers: {},                      //* 需要更新的会议成员
    mute: false,                            //* 本端静音   
    mediaRecorder,
    previewHint: null,
    renderHint: null,
    result: {                               //* 结果信息可用于提示
        code: API_SUCCESS,
        extra: [],                          //* 额外数据
        msg: '',
    }
    roomId: '',
    speakingId: '',                         //* 固定对讲组建立成功之后，当前是否有人正在讲话
    statsInfo: {                            //* 通话的统计信息，分辨率，码率，丢包率等信息
        bitRate: 0,
        fps:     0,
        width:   0,
        height:  0,
        packageLost: 0,
    },
    timer: 0,
    toUserId: '',
    toUserName: '',
    toMute: '',                             //* 对端静音
};
member: callNo -> {
    callNo: '',
    id: '',
    name: '',
    mute: true,                             //* true: 正在讲话或者抢得话权
    online: true,
    renderHint: null,                       //* 视频会议渲染元素
    status: MEM_STATUS.JOINED,
    speaking: fasle,                        //* 是否正在讲话
    isHost: false,                          //* 是否为主持人
    fps: 0,                                 //*
    width: 0, //*
    height: 0, //*
    bitRate: 0, //*
}
*/
function initGlobalState() {
    const userData_ = {
        userId: '',
        userName: '',
    };
    let websocket_  = null;
    let    isInit_  = false;
    let        ip_  = '';
    let      port_  = '';
    let     wsUrl_  = '';
    let fireEvent_  = _ => _;
    let serviceID_  = '';
    let serviceKey_ = '';
    let Services_   = '';
    
    const         handlers_ = {};
    const          actions_ = {};
    const        callDatas_ = {};
    const MEDIA_SDK_VERSION = '1.0.0';
    let             devices = {};
    let videoMonitorRoomId_ = '999999101100';

    function initState(init) {
        isInit_ = init;
    }
    function setSocket(socketData) {
        socketData.map(({ websocket, wsUrl, ip, port }) => {
            websocket_ = websocket;
            wsUrl_ = wsUrl;
            ip_ = ip;
            port_ = port;    
        })
    }
    function getSocket() {
        return websocket_;
    }
    function getIP() {
        return ip_;
    }
    function getPort() {
        return port_;
    }
    function getWsUrl() {
        return wsUrl_;
    }
    function getUserId() {
        return userData_.userId;
    }
    function setUserId(userId) {
        userData_.userId = userId;
    }
    function getUserName() {
        return userData_.userName;
    }
    function setUserName(userName) {
        userData_.userName = userName;
    }
    function getUserData() {
        return deepCopy(userData_);    
    }
    function setUserData(userId, userName) {
        userData_.userId = userId;
        userData_.userName = userName;
    }
    function getDevices() {
        return devices;
    }
    /**
    ** 获取默认的设备 
    */
    function getDefaultDevices() {
        return pipe(
            getDevices,
            ({audioinput, videoinput, audiooutput}) => ({ viDid: videoinput[0].id, aiDid: audioinput[0].id, aoDid: audiooutput[0].id})
        )()
    }
    function setDevices(devs) {
        devices = devs;
    }
    function getVideoMonitorRoomId() {
        return videoMonitorRoomId_;
    }
    function setVideoMonitorRoomId(roomId) {
        videoMonitorRoomId_ = roomId;
    }
    function getHiRTCInitData() {
        return deepCopy({ serviceID: serviceID_, serviceKey: serviceKey_, Services: Services_ });
    }
    function setHiRTCInitData({ serviceID, serviceKey, Services }) {
        serviceID_  = serviceID;
        serviceKey_ = serviceKey;
        Services_   = Services;
    }
    /**
     ** 已初始化
     */
    function inited() {
        initState(true)
    }
    /**
     ** 未初始化
     */
    function unInited() {
        initState(false);
    }
    function isInit() {
        return isInit_;
    }
    function registerHandler(event, handler) {
        handlers_[event] = handler;
    }
    function getHandler(event) {
        return handlers_[event];
    }
    function registerAction(type, action) {
        actions_[type] = action;
    }
    function getAction(type) {
        return actions_[type];
    }
    function mergeCallDataAndMsg(rawCallData, msg) {
        delete msg.sig;
        delete msg.msgType;
        delete msg.type;
        return deepCopy(rawCallData, msg);
    }
    /**
     ** 获取保存数据的键值
     **   ① 视频监控, 使用roomId
     **   ② 作为被叫时，使用roomId
     **   ③ 作为主叫时，使用RING状态下，单对单使用 fromUserId@toUserId, 群组使用 callType@fromUserId
     **     非RING状态下，使用roomId
     */
    function getDataKey(callData) {
        const { 
            callState, 
            callType,  
            fromUserId,
            isReceive, 
            roomId,
            toUserId,
        } = callData;
        const        isRing = CALL_STATE.isRing(callState);
        const     singleKey = `${fromUserId}@${toUserId}`;
        const      groupKey = `${callType}@${fromUserId}`;
        const       isGroup = ({ callType }) => CALL_TYPE.isGroup(callType);
        const   getGroupKey = ({ isRing, isReceive }) => isReceive ? roomId : isRing ? groupKey : roomId;
        const      isSingle = ({ callType }) => CALL_TYPE.isSingle(callType);
        const    getSingKey = ({ isRing, isReceive }) => isReceive ? roomId : isRing ? singleKey : roomId;
        const     isMonitor = ({ callType }) => CALL_TYPE.isVideoMonitor(callType);
        const getMonitorKey = () => roomId;
        return cond(
            [isMonitor, getMonitorKey],
            [isGroup,   getGroupKey  ],
            [isSingle,  getSingKey   ]
        )({ callType, isRing, isReceive });
    }
    /**
     ** 根据服务端返回数据获取保存数据的键值
     **     使用roomId作为键值
     */
    function getRawDataKey(callData) {
        const { roomId } = callData;
        return roomId;
    }
    /**
     ** 生成通话的数据 
     */
    function generateCallData({
        audioOnly        = 1, 
        callState        = CALL_STATE.RING,
        callType         = CALL_TYPE.NONE,
        conferenceRecord = CONF_RECORD.NON,
        fromUserId       = '', 
        fromUserName     = '',
        isReceive        = false,
        members          = {},
        updateMembers    = {},
        roomId           = '',
        subscribeId      = '',
        toUserId         = '', 
        toUserName       = '', 
        previewHint      = undefined,
        renderHint       = undefined,
    } = {}) {
        return {
            audioOnly,
            callType,
            callState,
            callEvent: CALL_EVENT.INIT,
            confNum: '',
            confName: '',
            conferenceRecord,
            fromUserId,
            fromUserName,
            isReceive,
            mediaRecorder: null,
            members,
            updateMembers,
            previewHint,
            recvPC: [],
            renderHint,
            result: {
                code: '000',
                msg: '',
            },
            roomId,
            sendPC: [],
            speakingId: '',                                            
            statsInfo: {
                bitRate: 0,
                fps:     0,
                width:   0,
                height:  0,
                packageLost: 0,
            },
            subscribeId,
            toUserId,
            toUserName,
            videoInfoTimer: 0,
        };
    }
    function generateConfMem({
        callNo      = '',
        name        = '',
        localMute   = false,
        localRecord = false,
        mute        = false,
        online      = true,
        renderHint  = null,
        status      = MEM_STATUS.JOINED,
        speaking    = false,
        subscribeId = '',
        isHost      = false,
        fps         = 0,
        bitRate     = 0,
        width       = 0,
        height      = 0,
    } = {}) {
        return {
            callNo,
            id: callNo ? callNo.substring(4) : '',
            name,
            localMute,
            localRecord,
            mute,
            online,
            renderHint,
            status,
            speaking,
            subscribeId,
            isHost,
            fps,
            bitRate,
            width,
            height,   
        } 
    }
    function insertCallData(data) {
        //todo: video 元素是否会有问题
        data = deepCopy(data);
        const key = getDataKey(data);
        callDatas_[key] = data;
        return deepCopy(callDatas_[key]);
    }
    /**
     ** 当前进行的通话统计
     */
    function getCallStatistics() {
        let voice           = 0;
        let voiceConf       = 0;
        let ptt             = 0;
        let tempPtt         = 0;
        let broadcast       = 0;
        let video           = 0;
        let videoConf       = 0;
        let forceInsert     = 0;
        let forceMonitor    = 0;
        let videoMonitor    = 0;
        Object.keys(callDatas_).forEach(key => {
            const { callType } = callDatas_[key];
            CALL_TYPE.isVoice(callType)         && voice++;
            CALL_TYPE.isVideoConf(callType)     && voiceConf++;
            CALL_TYPE.isPtt(callType)           && ptt++;
            CALL_TYPE.isTempPtt(callType)       && tempPtt++;
            CALL_TYPE.isBroadcast(callType)     && broadcast++;
            CALL_TYPE.isVideoConf(callType)     && videoConf++;
            CALL_TYPE.isVideo(callType)         && video++;
            CALL_TYPE.isForceInsert(callType)   && forceInsert++;
            CALL_TYPE.isForceMonitor(callType)  && forceMonitor++;
            CALL_TYPE.isVideoMonitor(callType)  && videoMonitor++;
        });
        return { voice, voiceConf, ptt, tempPtt, broadcast, video, videoConf, forceInsert, forceMonitor, videoMonitor };
    }
    function deleteCallData(dataKey) {
       return () => delete callDatas_[dataKey];    
    }
    function getAllCallData() {
        return deepCopy(callDatas_);
    }
    function getCallData(dataKey) {
        const callData = callDatas_[dataKey];
        return callData ? deepCopy(callData) : undefined;
    }
    /**
     ** 获取通话数据，仅内部使用
     */
    function getCallData_(dataKey) {
        return callDatas_[dataKey];
    }
    function updateCallData(dataKey, callDataNew) {
        Object.assign((callDatas_[dataKey] || (callDatas_[dataKey] = {})), callDataNew);
        return getCallData(dataKey);
    }
    function updateRoomId(dataKey, roomId) {
        return updateCallData(dataKey, { roomId });
    }
    function changeDataKey2RoomId(dataKey) {
        const callData_  = getCallData_(dataKey);
        seq(
            deleteCallData(dataKey),
            insertCallData
        )(callData_);
    }
    function getConfMembers_(dataKey) {
        const callData = getCallData_(dataKey);
        return callData ? callData.members : {};
    }
    function getMemeberByNo_(callNo, members) {
        return members[callNo];
    }
    function getConfMemByNo_(callNo, dataKey) {
        const getMember = curry(getMemeberByNo_)(callNo);
        return pipe(
            getConfMembers_,
            getMember,
        )(dataKey);
    }
    function changeMemberMute_(mute, member) {
        ifElse(
            !!member,
            member => member.mute = mute,
            fnError('media service update member mute failed, member is not existed')
        )(member);
    }
    function changeMemberStatus_(status, member) {
        ifElse(
            !!member,
            member => member.status = status,
            fnError('media service update member status failed, member is not existed')
        )(member);
    }
    function changeMemberSpeaking_(speaking, member) {
        ifElse(
            !!member,
            member => member.speaking = speaking,
            fnError('media service update member speaking failed, member is not existed')
        )(member);
    }
    function changeMemberVideoInfo_({fps, width, height, bitRate}, member) {
        ifElse(
            !!member,
            member => {
                member.fps     = fps;
                member.width   = width;
                member.height  = height;
                member.bitRate = bitRate;
            },
            fnError('media service update member video info failed, member is not existed')
        )(member);
    }
    function changeMemberSubsId_(subscribeId, member) {
        ifElse(
            !!member,
            member => member.subscribeId = subscribeId,
            fnError('media service update member subscribeId failed, member is not existed')
        )(member);
    }
    function updateMemberMute(dataKey, callNo, mute) {
        const getMember = curry(getConfMemByNo_)(callNo);
        const changeMute = curry(changeMemberMute_)(mute);
        pipe(
            getCallData_,
            clearUpdate_
        )(dataKey);
        pipe(
            genDataAndNo_,
            updateMembers_
        )({dataKey, callNo});
        pipe(
            getMember,
            changeMute,
        )(dataKey)
    }
    function updateMemberSpeaking(dataKey, callNo, speaking) {
        const getMember = curry(getConfMemByNo_)(callNo);
        const changeMute = curry(changeMemberSpeaking_)(speaking);
        pipe(
            getCallData_,
            clearUpdate_
        )(dataKey);
        pipe(
            genDataAndNo_,
            updateMembers_
        )({dataKey, callNo});
        pipe(
            getMember,
            changeMute,
        )(dataKey)
    }
    function updateMemberVideoInfo(dataKey, callNo, { fps, bitRate, width, height }) {
        const getMember = curry(getConfMemByNo_)(callNo);
        const changeVideoInfo = curry(changeMemberVideoInfo_)({ fps, bitRate, width, height });
        pipe(
            getCallData_,
            clearUpdate_
        )(dataKey);
        pipe(
            genDataAndNo_,
            updateMembers_
        )({dataKey, callNo});
        pipe(
            getMember,
            changeVideoInfo,
        )(dataKey)
    }
    function updateMemberSubsId(dataKey, callNo, subscribeId) {
        const    getMember = curry(getConfMemByNo_)(callNo);
        const changeSubsId = curry(changeMemberSubsId_)(subscribeId);
        pipe(
            getCallData_,
            clearUpdate_
        )(dataKey);
        pipe(
            genDataAndNo_,
            updateMembers_
        )({dataKey, callNo});
        pipe(
            getMember,
            changeSubsId,
        )(dataKey)
    }
    /**
     ** roomId 会议的roomId
     ** callNo 成员的callNo
     ** status 成员的状态
     */
     function updateMemberStatus(dataKey, callNo, status) {
        const     getMember = curry(getConfMemByNo_)(callNo);
        const  changeStatus = curry(changeMemberStatus_)(status);
        pipe(
            getCallData_,
            clearUpdate_
        )(dataKey);
        pipe(
            genDataAndNo_,
            updateMembers_
        )({dataKey, callNo});
        pipe(
            getMember,
            changeStatus
        )(dataKey);
    }
    function getConfMemSubsId(dataKey, callNo) {
        const getMember = curry(getConfMemByNo_)(callNo);
        return pipe(
            getMember,
            member => member.subscribeId,
        )(dataKey)
    }
    function addConfMember(dataKey, {callNo, callType, name, mute = false, renderHint = null, status = MEM_STATUS.JOINED} = {}) {
        const  isPtt = CALL_TYPE.isPttAll(callType);
        const member = generateConfMem({
            callNo, name, mute: isPtt || mute, online: true,
            renderHint, status, speaking: false,
        });
        const addConfMember_ = members => {
            !members[callNo] && (members[callNo] = member);
        };
        const updateMembers  = callData => (callData.updateMembers = {})[callNo] = member;
        pipe(
            getConfMembers_,
            addConfMember_,
        )(dataKey);
        //! 增量更新, 当前哪个成员发生了变化
        pipe(
            getCallData_,
            updateMembers
        )(dataKey);
    }
    function genDataAndNo_({dataKey, callNo}) {
        return {callData: getCallData_(dataKey), callNo}
    }
    function updateMembers_({callData, callNo}) {
        callData.updateMembers[callNo] = callData.members[callNo]
    }
    function clearUpdate_(callData) {
        callData.updateMembers = {}
    }
    function delConfMember(dataKey, callNos) {
        const    getMembers = ({dataKey, callNo}) => ({members: getConfMembers_(dataKey), callNo})
        const delConfMember_ = ({members, callNo}) => delete members[callNo];
        pipe(
            getCallData_,
            clearUpdate_
        )(dataKey);
        //! 增量更新, 当前哪个成员发生了变化
        const updateMem = pipe(
            genDataAndNo_,
            updateMembers_
        );
        const deleteMem = pipe(
            getMembers,
            delConfMember_
        );
        callNos.forEach(callNo => {
            updateMem({dataKey, callNo});
            deleteMem({dataKey, callNo});
        });
    }
    function getConfMemByNo(dataKey, callNo) {
        const getMember = curry(getMemeberByNo_)(callNo);
        return pipe(
            getConfMembers_,
            getMember,
            member => member ? deepCopy(member) : member
        )(dataKey);
    }
    function resetMemMediaEle(dataKey, callNo) {
        const getMember = curry(getMemeberByNo_)(callNo);
        pipe(
            getConfMembers_,
            getMember,
            member => member && member.renderHint && (member.renderHint.srcObject = null)
        )(dataKey);
    }
    function getMediaRecorder(dataKey) {
        const callData = getCallData_(dataKey);
        return callData ? callData.mediaRecorder : undefined;
    }
    function clearMediaRecorder(dataKey) {
        const callData = getCallData_(dataKey);
        callData && (callData.mediaRecorder = null);
    }
    function clearVideoInfoTimer(dataKey) {
        const callData = getCallData_(dataKey);
        callData && (clearInterval(callData.videoInfoTimer), callData.videoInfoTimer = 0);
    }
    /**
     ** 更新语音会议/视频会议/对讲群组中的成员
     */
    function updateConfMembers(dataKey, totalMemberList, onlineMemberList) {
        const      callData = getCallData_(dataKey);
        const     statusMap = {};
        const updateMembers = {};
        const { 
            callType, 
            members 
        } = callData;
        const mute = CALL_TYPE.isPttAll(callType);
        onlineMemberList.forEach(callNo => statusMap[callNo] = true);
        totalMemberList.forEach(callNo => {
            const inConf = !!statusMap[callNo];
            const status = inConf ? MEM_STATUS.JOINED : MEM_STATUS.CALLING;
            const member = members[callNo] || generateConfMem({ callNo, mute });
            member.status = status; 
            updateMembers[callNo] = member;
        });
        callData.members = members;
        callData.updateMembers = updateMembers;
    }
    function updateMemberField(dataKey, callNo, field, value) {
        const   getMember = members => members[callNo];
        const changeField = member => member[field] = value;
        pipe(
            getConfMembers_,
            getMember,
            and(identity, changeField)
        )(dataKey)
    }
    /**
     ** 变更当前通话的状态开始，振铃，或者结束...
     */
    function changeCallState(dataKey, state) {
        const changeState = curry((state, callData) => callData && (callData.callState = state))(state)
        return pipe(getCallData_, changeState)(dataKey);
    }
    function callStateIdle(dataKey) {
        const changeState = curry((state, dataKey) => changeCallState(dataKey, state))(CALL_STATE.IDLE);
        return functionalize(changeState, dataKey);
    }
    function callStateRing(dataKey) {
        const changeState = curry((state, dataKey) => changeCallState(dataKey, state))(CALL_STATE.RING);
        return functionalize(changeState, dataKey);
    }
    function callStateRingWait(dataKey) {
        const changeState = curry((state, dataKey) => changeCallState(dataKey, state))(CALL_STATE.WAIT_RING_BACK);
        return functionalize(changeState, dataKey);
    }
    function callStateTalking(dataKey) {
        const changeState = curry((state, dataKey) => changeCallState(dataKey, state))(CALL_STATE.TALKING);
        return functionalize(changeState, dataKey);
    }
    function callStateHold(dataKey) {
        const changeState = curry((state, dataKey) => changeCallState(dataKey, state))(CALL_STATE.LINE_HOLD);
        return functionalize(changeState, dataKey);
    }
    function callStateReject(dataKey) {
        const changeState = curry((state, dataKey) => changeCallState(dataKey, state))(CALL_STATE.REJECTED);
        const addResult = curry((result, dataKey) => addCallResult(dataKey, result))(ERROR_MSG.PEER_REJECT);
        return functionalize(seq(changeState, addResult), dataKey);
    }
    function callStateFailed(dataKey, result = {}) {
        const changeState = curry((state, dataKey) => changeCallState(dataKey, state))(CALL_STATE.FAILED);
        const addResult = curry((result, dataKey) => addCallResult(dataKey, result))(result);
        return functionalize(seq(changeState, addResult), dataKey);
    }
    function callStateBye(dataKey) {
        const changeState = curry((state, dataKey) => changeCallState(dataKey, state))(CALL_STATE.BYE);
        const addResult = curry((result, dataKey) => addCallResult(dataKey, result))(ERROR_MSG.PEER_TERMIN);
        return functionalize(seq(changeState, addResult), dataKey);
    }
    function addCallResult(dataKey, result) {
        const callData = getCallData_(dataKey);
        callData && (callData.result = result);
    }
    /**
     ** 添加上报的CALL_EVENT事件以及对应的原因 
     */
    function changeCallEvent(dataKey, event) {
        const callData = getCallData_(dataKey);
        callData && (callData.callEvent = event);
    }
    function grabSuccessEvent(dataKey) {
        const changeEvent = curry((event, dataKey) => changeCallEvent(dataKey, event))(CALL_EVENT.GRAB_SUCCESS);
        return functionalize(changeEvent, dataKey);
    }
    function grabFailedEvent(dataKey, result = ERROR_MSG.GRAB_FAILED) {
        const   addResult = curry((result, dataKey) => addCallResult(dataKey, result))(result);
        const changeEvent = curry((event, dataKey) => changeCallEvent(dataKey, event))(CALL_EVENT.GRAB_FAILED);
        return functionalize(seq(changeEvent, addResult), dataKey);
    }
    function freeSuccessEvent(dataKey) {
        const changeEvent = curry((event, dataKey) => changeCallEvent(dataKey, event))(CALL_EVENT.FREE_SUCCESS);
        return functionalize(changeEvent, dataKey);
    }
    function freeFailedEvent(dataKey, result = ERROR_MSG.FREE_FAILED) {
        const   addResult = curry((result, dataKey) => addCallResult(dataKey, result))(result);
        const changeEvent = curry((event, dataKey) => changeCallEvent(dataKey, event))(CALL_EVENT.FREE_FAILED);
        return functionalize(seq(changeEvent, addResult), dataKey);
    }
    function sdpFailedEvent(dataKey, result = ERROR_MSG.SDP_FAILED) {
        const   addResult = curry((result, dataKey) => addCallResult(dataKey, result))(result);
        const changeEvent = curry((event, dataKey) => changeCallEvent(dataKey, event))(CALL_EVENT.SDP_FAILED);
        return functionalize(seq(changeEvent, addResult), dataKey);
    }
    function subscribeFailedEvent(dataKey, result = ERROR_MSG.SUBS_FAILED10) {
        const   addResult = curry((result, dataKey) => addCallResult(dataKey, result))(result);
        const changeEvent = curry((event, dataKey) => changeCallEvent(dataKey, event))(CALL_EVENT.SUBS_FAILED);
        return functionalize(seq(changeEvent, addResult), dataKey);
    }
    function confMemUpdateEvent(dataKey) {
        const changeEvent = curry((event, dataKey) => changeCallEvent(dataKey, event))(CALL_EVENT.MEM_UPDATE);
        return functionalize(changeEvent, dataKey);
    }
    function confMemAcceptEvent(dataKey) {
        const changeEvent = curry((event, dataKey) => changeCallEvent(dataKey, event))(CALL_EVENT.MEM_ACCEPT);
        return functionalize(changeEvent, dataKey);
    }
    function confMemRefuseEvent(dataKey) {
        const changeEvent = curry((event, dataKey) => changeCallEvent(dataKey, event))(CALL_EVENT.MEM_REFUSE);
        return functionalize(changeEvent, dataKey);
    }
    function confMemKickeEvent(dataKey, result = ERROR_MSG.MEM_KICKED) {
        const   addResult = curry((result, dataKey) => addCallResult(dataKey, result))(result);
        const changeEvent = curry((event, dataKey) => changeCallEvent(dataKey, event))(CALL_EVENT.MEM_KICKED);
        return functionalize(seq(changeEvent, addResult), dataKey);
    }
    function getMediaElement(dataKey) {
        const callData = getCallData_(dataKey);
        return callData ? callData.renderHint : undefined;
    }
    function setMediaElement(dataKey, element) {
        const callData = getCallData_(dataKey);
        callData && (callData.renderHint = element);
    }
    function setPreviewElement(dataKey, element) {
        const callData = getCallData_(dataKey);
        callData && (callData.previewHint = element);
    }
    function updateSendPeerConnection(dataKey, pc) {
        const callData = getCallData_(dataKey);
        callData && (callData.sendPC = pc);
        return callData;
    }
    function getSendPeerConnection(dataKey) {
        const callData = getCallData_(dataKey);
        return callData ? callData.sendPC : undefined;
    }
    function updateRecvPeerConnection(dataKey, peerId, pc) {
        const callData = getCallData_(dataKey);
        callData && ((callData.recvPC || (callData.recvPC = {}))[peerId] = pc);
        return callData;
    }
    function getRecvPeerConnectionById(dataKey, peerId) {
        const callData = getCallData_(dataKey);
        const recvPC = callData ? callData.recvPC : undefined;
        return recvPC ? recvPC[peerId] : undefined;
    }
    function getRecvPeerConnections(dataKey) {
        const callData = getCallData_(dataKey);
        return callData ? callData.recvPC : undefined;
    }
    /**
     ** 将服务端数据的callType转换为本地的callTtype 
     */
    function rawCallType2CallTye(rawCallData) {
        const { audioOnly, callType: rawCallType } = rawCallData;
        const callType = RAW_CALL_TYPE_2_CALL_TYPE[rawCallType + audioOnly];
        return callType;
    }
    function getSDKVersion() {
        return MEDIA_SDK_VERSION;
    }
    function getFireEvent(dataKey) {
        return event => fireEvent_(getCallData(dataKey), event);
    }
    function getFireEventWithData(data) {
        return event => fireEvent_(data, event);
    }
    /**
     ** 上报通话状态变更事件 
     */
    function fireStateEvent(dataKey) {
        return functionalize(getFireEvent(dataKey), FIRE_EVENT.STATE_CHANGED);
    }
    /**
     ** 上报通话到达事件 
     */
    function fireCallArrive(dataKey) {
        return functionalize(getFireEvent(dataKey), FIRE_EVENT.CALL_ARRIVE);
    }
    /**
     ** 上报群组成员更新 
     */
    function fireMemberUpdate(dataKey) {
        return functionalize(getFireEvent(dataKey), FIRE_EVENT.MEMBER_UPDATE);
    }
    /**
     ** 上报视频通话统计信息 
     */
    function fireVideoInfo(dataKey) {
        return functionalize(getFireEvent(dataKey), FIRE_EVENT.VIDEO_INFO);
    }
    /**
     ** 上报操作事件
     */
    function fireCallEvent(dataKey) {
        return functionalize(getFireEvent(dataKey), FIRE_EVENT.CALL_EVENT);
    }
    function fireTmlStatus(userId, status) {
        return functionalize(getFireEventWithData({ userId, status }), FIRE_EVENT.TML_STATUS);
    }
    function firePttActive(roomId) {
        return functionalize(getFireEventWithData({ roomId }), FIRE_EVENT.PTT_ACTIVE);
    }
    function fireSigConnected() {
        return functionalize(getFireEventWithData({}), FIRE_EVENT.CONNECTED);
    }
    function fireSigDisconnected() {
        return functionalize(getFireEventWithData({}), FIRE_EVENT.DISCONNECTED);
    }
    function fireErrorEvent(event, msg) {
        return functionalize(getFireEventWithData({event, msg}), FIRE_EVENT.ERROR_OCCURED);
    }
    function fireRoomIdEvent(dataKey) {
        return functionalize(getFireEvent(dataKey), FIRE_EVENT.UPDATE_ROOM_ID);
    }
    function fireCustomMessage(msg) {
        return functionalize(getFireEventWithData({ content: msg }), FIRE_EVENT.CUSTOM_MESSAGE);
    }
    /**
     ** 注册事件上报的函数
     */
    function registerFireEvent(fireEvent) {
        fireEvent_ = fireEvent;
    }
    return {
        setSocket, getSocket, getIP, getPort, getWsUrl, setUserId, getUserId, setUserName, getUserName, setUserData, setVideoMonitorRoomId, getHiRTCInitData, setHiRTCInitData,
        getUserData, setDevices, getDevices, getDefaultDevices, isInit, inited, unInited, registerHandler, getHandler, registerAction, getVideoMonitorRoomId,
        getAction, mergeCallDataAndMsg, getDataKey, getRawDataKey, generateCallData, generateConfMem, insertCallData, updateMemberVideoInfo,
        getCallStatistics, deleteCallData, getAllCallData, getCallData, updateCallData, updateRoomId, changeDataKey2RoomId, updateMemberMute, updateMemberSubsId,
        addConfMember, delConfMember, updateMemberStatus, getMediaRecorder, clearMediaRecorder, clearVideoInfoTimer, updateMemberSpeaking,
        updateConfMembers, callStateRing, callStateRingWait, callStateTalking, callStateReject, callStateFailed, callStateHold, callStateIdle,
        callStateBye, grabSuccessEvent, grabFailedEvent, freeSuccessEvent, freeFailedEvent, sdpFailedEvent, confMemAcceptEvent, getConfMemSubsId,
        subscribeFailedEvent, getMediaElement, setMediaElement, setPreviewElement, updateSendPeerConnection, confMemRefuseEvent, confMemKickeEvent,
        getSendPeerConnection, updateRecvPeerConnection, getRecvPeerConnectionById, getRecvPeerConnections, confMemUpdateEvent, rawCallType2CallTye, 
        getSDKVersion, getFireEvent, fireStateEvent, fireCallArrive, fireMemberUpdate, getConfMemByNo, resetMemMediaEle, fireVideoInfo, 
        fireCallEvent, fireTmlStatus, firePttActive, fireSigConnected, fireSigDisconnected, fireErrorEvent, fireRoomIdEvent, fireCustomMessage, 
        registerFireEvent, updateMemberField,
    }
}
export const FIRE_EVENT = {
    CONNECTED:          'connected'        ,    //* 与信令服务器连接成功
    DISCONNECTED:       'disconnected'     ,    //* 与信令服务器连接断开
    CALL_ARRIVE:        'call_arrive'      ,    //* 有通话进来
    STATE_CHANGED:      'state_changed'    ,    //* 通话的状态发生变化
    ERROR_OCCURED:      'error_occured'    ,    //* 通话发生错误
    MEMBER_UPDATE:      'member_update'    ,    //* 群组成员更新
    VIDEO_INFO:         'video_info'       ,    //* 视频通话统计信息
    CALL_EVENT:         'call_event'       ,    //* 加人/踢人/禁言等操作事件
    TML_STATUS:         'tml_status_change',    //* 终端上下线
    UPDATE_ROOM_ID:     'update_room_id'   ,    //* 上报房间id
    PTT_ACTIVE:         'ptt_active'       ,    //* 对讲组活跃
    CUSTOM_MESSAGE:     'custom_message'   ,    //* 自定义消息
}
export const MEM_STATUS = {                     //! 群组内成员的状态
	INIT:               0,                      //* 无状态
	CALLING:            1,                      //* 正在呼叫
	JOINED:             2,                      //* 已加入
	QUIT:               3,                      //* 已退出
    REJECTED:           4,                      //* 已拒绝
    FAILED:             5,                      //* 已失败
    isJoined(status) {
        return this.JOINED === status;
    },
    isQuit(status) {
        return this.QUIT === status;
    },
    isRejected(status) {
        return this.REJECTED === status;
    }
};

export const STATUS_2_MEM_STATUS = {
    'joinfinish':       MEM_STATUS.JOINED,
    'reject':           MEM_STATUS.REJECTED,
    'leave':            MEM_STATUS.QUIT
}

export const CALL_STATE = {
	IDLE:               0,                      //* 0空闲
	RING:               1,                      //* 1线路振铃, 监控中表示正在拉流，此时为转圈
	WAIT_RING_BACK:     2,                      //* 2线路等待回铃
	RING_BACK:          3,                      //* 3线路回铃
	TALKING:            4,                      //* 4线路通话, 监控中表示已拉到流
	LINE_HOLD:          5,                      //* 5线路保持, 监控中表示获取到流地址, 但是还未拉到流
	REJECTED:           6,
	BYE:                7,
	CANCEL:             8,
	FAILED:             9,
    isTalking(state) {
        return this.TALKING === state;
    },
    isRing(state) {
        return this.RING === state;
    },
    isIdle(state) {
        return this.IDLE === state;
    },
    isHold(state) {
        return this.LINE_HOLD === state;
    },
};

export const CALL_EVENT = {
	INIT:               0,
	ADD_SUCCESS:        11,                     //* 会议邀请成功
	ADD_FAILED:         12,
	END_FAILED:         13,                     //* 会议结束失败
	END_SUCCESS:        14,
	START_SUCCESS:      15,                     //* 会议开始成功
	START_FAILED:       16,
	KICK_SUCCESS:       17,
	KICK_FAILED:        18,
	MUTE_SUCCESS:       19,
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

export const ERROR_EVENT = {
    ASK_PMI_FAILED:     0,                      //* 请求设备权限失败
    NO_DEVICES:         1,                      //* 当前无可用设备
}

export const ERROR_MSG = {
    CREATE_FAILED:  { code: '001', extra: [], msg: '创建通话失败'   },
    FREE_FAILED:    { code: '002', extra: [], msg: '释放话权失败'   },
    GRAB_FAILED:    { code: '003', extra: [], msg: '抢话权失败'     },
    SDP_FAILED:     { code: '004', extra: [], msg: 'SDP协商失败'   },
    INVITE_FAILED:  { code: '005', extra: [], msg: '成员邀请失败'   },
    KICK_FAILED:    { code: '006', extra: [], msg: '成员踢出失败'   },
    MUTE_FAILED:    { code: '007', extra: [], msg: '成员禁言失败'   },
    ASK_PMI_FAILED: { code: '008', extra: [], msg: '请求权限失败'   },
    NO_DEVICES:     { code: '009', extra: [], msg: '无可用设备'     },
    SUBS_FAILED10:  { code: '010', extra: [], msg: '未分配而媒体元素'},
    MEM_KICKED:     { code: '011', extra: [], msg: '你被踢出会议'   },
    PEER_REJECT:    { code: '012', extra: [], msg: '对端已拒绝'     },
    PEER_TERMIN:    { code: '013', extra: [], msg: '对端已结束'     },
}

//! 由于视频类的通话需要通过 voice 与 audioOnly 来表示，对外使用 CALL_TYPE 来暴露通话类型，CALL_TYPE_只能在内部使用
export const CALL_TYPE_RAW = {
    VOICE:              'voice',                //* 音视频通话
    CONFERENCE:         'conference',           //* 音视频会议
    TEMP_PTT:           'tempptt',              //* 临时对讲
    PTT:                'ptt',                  //* 固定对讲
    BROADCAST:          'shout',                //* 广播喊话
    isVoice(type) {
        return this.VOICE === type;
    },
    isConf(type) {
        return this.CONFERENCE === type;
    },
    isTempPtt(type) {
        return this.TEMP_PTT === type;
    },
    isPtt(type) {
        return this.PTT === type;
    },
    isPttAll(type) {
        return [this.PTT, this.TEMP_PTT].includes(type);
    },
    isBroadcast(type) {
        return this.BROADCAST === type;
    }
};
export const CALL_TYPE = {
    NONE:               '',                     //* 无 
    VOICE:              'voice',                //* 语音通话
    VOICE_CONFERENCE:   'voice_conference',     //* 语音会议
    TEMP_PTT:           'tempptt',              //* 临时对讲
    PTT:                'ptt',                  //* 固定对讲
    BROADCAST:          'shout',                //* 广播喊话
    VIDEO:              'video',                //* 视频通话
    VIDEO_CONFERENCE:   'video_conference',     //* 视频会议
    VIDEO_MONITOR:      'video_monitor',        //* 视频监控
    FORCE_INSERT:       'force_insert',         //* 强插
    FORCE_MONITOR:      'force_monitor',        //* 监听
    isNone(type) {
        return this.NONE === type;
    },
    isVoice(type) {
        return this.VOICE === type;
    },
    isVoiceConf(type) {
        return this.VOICE_CONFERENCE === type;
    },
    isVideoMonitor(type) {
        return this.VIDEO_MONITOR === type;
    },
    isPtt(type) {
        return this.PTT === type;
    },
    isTempPtt(type) {
        return this.TEMP_PTT === type;
    },
    isPttAll(type) {
        return [this.PTT, this.TEMP_PTT].includes(type);
    },
    isBroadcast(type) {
        return this.BROADCAST === type;
    },
    isVideo(type) {
        return this.VIDEO === type;
    },
    isVideoConf(type) {
        return this.VIDEO_CONFERENCE === type;
    },
    publishVideo(type) {
        return this.isVideo(type) || this.isVideoConf(type);
    },
    subscribeVideo(type) {
        return this.isVideo(type) || this.isVideoConf(type) || this.isVideoMonitor(type);
    },
    needPreview(type) {
        return !this.isForceMonitor(type);
    },
    isForceInsert(type) {
        return this.FORCE_INSERT === type;
    },
    isForceMonitor(type) {
        return this.FORCE_MONITOR === type;
    },
    isConf(type) {
        return this.isVoiceConf(type) || this.isVideoConf(type);
    },
    isSingle(type) {
        return this.isVoice(type) || this.isVideo(type) || this.isForceInsert(type) || this.isForceMonitor(type);
    },
    isGroup(type) {
        return this.isConf(type) || this.isPttAll(type) || this.isVideoMonitor(type) || this.isBroadcast(type); 
    },
    isAudioOnly(type) {
        return this.publishVideo(type) ? MEDIA_TRACK.VIDEO_AUDIO : MEDIA_TRACK.AUDIO_ONLY;
    },
}

export const   isSingle = ({callType}) => CALL_TYPE.isSingle(callType);
export const    isVoice = ({callType}) => CALL_TYPE.isVoice(callType);
export const    isVideo = ({callType}) => CALL_TYPE.isVideo(callType);
export const    isVConf = ({callType}) => CALL_TYPE.isVideoConf(callType);
export const    isAConf = ({callType}) => CALL_TYPE.isVoiceConf(callType);
export const   isInsert = ({callType}) => CALL_TYPE.isForceInsert(callType);
export const   isBodcst = ({callType}) => CALL_TYPE.isBroadcast(callType);
export const  isMonitor = ({callType}) => CALL_TYPE.isForceMonitor(callType);
export const isVMonitor = ({callType}) => CALL_TYPE.isVideoMonitor(callType);
export const notVMonitor = ({callType}) => !CALL_TYPE.isVideoMonitor(callType);

export const MEDIA_TRACK = {
    AUDIO_ONLY:         '1',      //* 只有音频
    VIDEO_AUDIO:        '0',      //* 同时具有音视频
    all (code) {
        return this.VIDEO_AUDIO === code;
    }
}

export const CONF_RECORD = {
    NON:    '0',
    RECORD: '1',
}

export const RAW_CALL_TYPE_2_CALL_TYPE = (function () {
    const map = {};
    map[CALL_TYPE_RAW.PTT + MEDIA_TRACK.AUDIO_ONLY]         = CALL_TYPE.PTT;
    map[CALL_TYPE_RAW.TEMP_PTT + MEDIA_TRACK.AUDIO_ONLY]    = CALL_TYPE.TEMP_PTT;
    map[CALL_TYPE_RAW.BROADCAST + MEDIA_TRACK.AUDIO_ONLY]   = CALL_TYPE.BROADCAST;
    map[CALL_TYPE_RAW.VOICE + MEDIA_TRACK.AUDIO_ONLY]       = CALL_TYPE.VOICE;
    map[CALL_TYPE_RAW.VOICE + MEDIA_TRACK.VIDEO_AUDIO]      = CALL_TYPE.VIDEO;
    map[CALL_TYPE_RAW.CONFERENCE + MEDIA_TRACK.AUDIO_ONLY]  = CALL_TYPE.VOICE_CONFERENCE;
    map[CALL_TYPE_RAW.CONFERENCE + MEDIA_TRACK.VIDEO_AUDIO] = CALL_TYPE.VIDEO_CONFERENCE;
    return map;
})();

export const CALL_TYPE_2_RAW_CALL_TYPE = (function () {
    const map = {};
    map[CALL_TYPE.VIDEO_CONFERENCE] = CALL_TYPE_RAW.CONFERENCE;
    map[CALL_TYPE.VOICE_CONFERENCE] = CALL_TYPE_RAW.CONFERENCE;
    map[CALL_TYPE.PTT]              = CALL_TYPE_RAW.PTT;
    map[CALL_TYPE.TEMP_PTT]         = CALL_TYPE_RAW.TEMP_PTT;
    map[CALL_TYPE.BROADCAST]        = CALL_TYPE_RAW.BROADCAST;
    map[CALL_TYPE.VIDEO]            = CALL_TYPE_RAW.VOICE;
    map[CALL_TYPE.VOICE]            = CALL_TYPE_RAW.VOICE;
    return map;
})();

export const { 
    setSocket, getSocket, getIP, getPort, setUserData, getUserData, setDevices, getDevices, getDefaultDevices, isInit, inited, unInited, registerHandler, getVideoMonitorRoomId,
    getHandler, registerAction, getAction, getDataKey, getRawDataKey, generateCallData, generateConfMem, insertCallData, setVideoMonitorRoomId, getHiRTCInitData, setHiRTCInitData,
    getCallStatistics, deleteCallData, getAllCallData, getCallData, updateCallData, updateRoomId, changeDataKey2RoomId, updateMemberMute, updateMemberSpeaking,
    addConfMember, delConfMember, updateMemberStatus, getMediaRecorder, clearMediaRecorder, clearVideoInfoTimer, updateConfMembers, updateMemberVideoInfo, updateMemberSubsId,
    callStateRing, callStateRingWait, callStateTalking, callStateReject, callStateFailed, callStateBye, grabSuccessEvent, callStateHold, callStateIdle, getConfMemSubsId,
    grabFailedEvent, freeSuccessEvent, freeFailedEvent, sdpFailedEvent, subscribeFailedEvent, getMediaElement, setMediaElement, setPreviewElement,
    updateSendPeerConnection, getSendPeerConnection, updateRecvPeerConnection, getRecvPeerConnectionById, getRecvPeerConnections, confMemKickeEvent, rawCallType2CallTye, 
    getSDKVersion, fireStateEvent, fireCallArrive, fireMemberUpdate, fireVideoInfo, fireCallEvent, fireTmlStatus, firePttActive, fireSigConnected, fireSigDisconnected, 
    resetMemMediaEle, fireErrorEvent, fireRoomIdEvent, fireCustomMessage, registerFireEvent, updateMemberField, confMemAcceptEvent, confMemRefuseEvent, confMemUpdateEvent, getConfMemByNo
} = initGlobalState();