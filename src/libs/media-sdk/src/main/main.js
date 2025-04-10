/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
import { 
    ACK_CODE, ACK_TEXT, CHILD_MSG_TYPE, DIRECTION, GROUP_OPT, MONITOR_OPT, NOTIFY_TYPE, ONLINE_STATE, SIG_TYPE, 
    accept, destroy, free, grab, initSignalingService, 
    invite,  invitePtt, inviteTempPtt,  kick, kickPtt, kickTempPtt, leave, mute, queryMembers, recvOfferSignalling, 
    reject, remoteCtrlSignalling, sendCustomMessage, sendJoinFinish, sendOfferSignalling, unInitSignallingService, 
    unmute
} from '../api/signalling.js';
import { 
    MEDIA_TRACK, CALL_TYPE, ERROR_EVENT, ERROR_MSG, CALL_TYPE_RAW, STATUS_2_MEM_STATUS,
    getSDKVersion, setUserData, setSocket, inited, deleteCallData, callStateFailed,
    isInit, registerHandler, getHandler, registerAction, callStateBye, addConfMember,
    getAction, getCallData, updateSendPeerConnection, fireVideoInfo, delConfMember,
    updateRecvPeerConnection, getSendPeerConnection, clearVideoInfoTimer, getDevices,
    getRecvPeerConnectionById, getMediaElement,registerFireEvent, updateMemberMute,
    fireStateEvent, updateCallData, callStateTalking, getRawDataKey, updateRoomId,
    updateConfMembers, fireMemberUpdate, getMediaRecorder, callStateReject, fireErrorEvent,
    clearMediaRecorder, getRecvPeerConnections, grabSuccessEvent, fireCallEvent, setDevices,
    grabFailedEvent, freeSuccessEvent, freeFailedEvent, updateMemberStatus, fireTmlStatus,
    RAW_CALL_TYPE_2_CALL_TYPE, callStateRingWait, changeDataKey2RoomId, sdpFailedEvent,
    getDataKey, getUserData, subscribeFailedEvent, updateMemberField, confMemAcceptEvent, 
    confMemRefuseEvent, confMemUpdateEvent, getConfMemByNo, MEM_STATUS, fireRoomIdEvent, 
    CALL_STATE, updateMemberSpeaking, updateMemberVideoInfo, confMemKickeEvent, generateCallData, generateConfMem, isVConf, isAConf, isSingle, isInsert, isMonitor, isVMonitor, notVMonitor, updateMemberSubsId, getConfMemSubsId, getVideoMonitorRoomId, fireSigConnected, fireSigDisconnected, firePttActive, isVoice, isVideo, setVideoMonitorRoomId,
    resetMemMediaEle,
    getCallStatistics,
    fireCustomMessage,
    getDefaultDevices,
    setHiRTCInitData,
    isBodcst,
    CONF_RECORD,
    getSocket,
} from '../data/global.data.js';
import { TIMER_S, deepCopy, getUserIdFromPublishId } from '../utils/common.js';
import { downloadFileByA, getFileName } from '../utils/file.js';
import {
    cond,
    curry, Either, fnError, fnLog, functionalize, identity, ifElse, partial, pipe, Task, then,
} from '../utils/functional-utils.js';
import SocketJS from '../utils/socket.js';
import { 
    HiRTC_ERROR_CODE, doInitHiRTC, getCurData, getDeviceList, getPermission, 
    joinRoom, previewStart, publishStream, selectVideoDevices, 
    selectAudioDevices , subscribeStream, muteLocalA, HiRTC_STREAM_TRACK, audioInfoReport, videoInfoReport, previewStop, getMaxStreamLayerIndex, startRecordLocal, stopRecordLocal, startRecordRemote, stopRecordRemote, leaveHiRTC, captureRemoteImage, muteRemoteA, 
    doInitMonitorHiRTC,
    getMonitorCurData,
    getMonitorDeviceList,
    publishMonitorStream,
    subscribeMonitorStream,
    videoMonitorInfoReport,
    muteMonitorLocalA,
    muteMonitorRemoteA,
    startMonitorRecordLocal,
    startMonitorRecordRemote,
    stopMonitorRecordLocal,
    stopMonitorRecordRemote,
    HiRTC_RECORD_TYPE
} from '../webrtc/hirtc.js';
import { 
    audioMediaRecord, closePeerConnection, createAudioMedia, createReceiveMedia, getVideoStatsInfo, 
    setMediaRemoteDescription, setMediaOnTrack, startRecord, stopRecord, muteAudioStream
} from '../webrtc/media.js';
import { 
    createVideoCall, createVideoConference, createVideoMonitor, setVideoElement, videoCallIn
} from './video.js';
import { 
    createBroadcast, createPtt, createTempPtt, createVoiceCall, createVoiceConference, 
    forceBreakCall as forceBreak, forceInsertCall, forceMonitorCall, joinActivePtt, setAudioElement, 
    voiceCallIn
} from './voice.js';

export { 
    getSDKVersion, 
    generateCallData, 
    getCallStatistics, 
    FIRE_EVENT, 
    CALL_EVENT, 
    CALL_STATE, 
    CALL_TYPE, 
    MEDIA_TRACK,
    MEM_STATUS,
} from '../data/global.data.js';

export { subscribeStream, muteMonitorLocalA, HiRTC_RECORD_TYPE as RECORD_TYPE } from '../webrtc/hirtc.js';

export { 
    addVideoMonitorMember, removeVideoMonitorMember, 
    startVideoMonitorVoice, stopVideoMonitorVoice, 
    forwardVideoMonitor, videoMonitorRetrying,
} from './video.js';

export {
    CHILD_MSG_TYPE
} from '../api/signalling.js';

export { httpApi } from '../api/http.js';
/** 
 *  todo list
 *  todo 会议踢人/邀请，是否成功
 *  todo 聚联SDK需要申请serviceID，serviceKey
*/

/**
** 初始化sdk服务:
**   1. 记录当前登录的用户
**   2. 初始化信令服务
**   3. 保存全局所需的数据，如 websocket 等，
**   4. 标记为已初始化避免重复初始化
**   5. 注册事件触发FireEvent
**   6. 注册通话创建的Actions
**   7. 注册信令处理Handler
**   8. 初始化聚连SDK
*/
export function initMediaSdk({
    ip, port, 
    userId     = '', 
    userName   = '', 
    fireEvent  = _ => _, 
    serviceID  = '90f4d5a954ab449e9b6aac92', 
    serviceKey = '2c17c6393771ee3048ae34d6b380c5ec', 
    Services   = {BasicRoomServiceToken: 'https://121.36.105.19:7080/v1/auth/token'},
    sslEnable  = false,
    videoMonitorRoomId = '', 
} = {}) {
    const initSignaling = partial(initSignalingService, ip, port, undefined, sslEnable,signalingFireEvent);
    const       setUser = ({userId, userName}) => (setUserData(userId, userName), userId);
    const doInitServcie = pipe(setUser, initSignaling, setSocket, inited);
    const      isInited = isInit();
    Either.of(!isInited)
    .map(() => {
        console.log(`media service init service ip: ${ip} port: ${port} userId: ${userId} userName: ${userName}, videoMonitorRoomId: ${videoMonitorRoomId}`);
        console.log(`media service WebRTC SDK 版本: ${getSDKVersion()}`);
    })
    .map(() => {
        doInitServcie({userId, userName});
    })
    .map(() => {
        registerFireEvent(fireEvent);
    })
    .map(() => {
        registerActions();
    })
    .map(() => {
        registerSignalingHandler();
    })
    .map(() => {
        initHiRTC({ serviceID, serviceKey, Services });
    })
    .map(() => {
        initMonitorHiRTC({ serviceID, serviceKey, Services });
    })
    .map(() => {
        setVideoMonitorRoomId(videoMonitorRoomId);
        setHiRTCInitData({ serviceID, serviceKey, Services });
    });
    return isInited;
}

export function isMediaSdkInit() {
    const inited = isInit();
    return inited;
}
/**
** 公有云部署，则更换serviceKey，serviceID就可以，Services字段不传 
** 私有云部署，则更换serviceKey，serviceID，Services
** BasicRoomServiceToken路径，根据不同的部署环境，需要手动去更新写死
*/
function initHiRTC({ 
    serviceID  = '90f4d5a954ab449e9b6aac92', 
    serviceKey = '2c17c6393771ee3048ae34d6b380c5ec', 
    Services   = {BasicRoomServiceToken: 'https://121.36.105.19:7080/v1/auth/token'}
} = {}) {
    const handlers = {
        handleAudioReport(info) {
            // console.log('media service audio report info: ', info);
            const curData = getCurData();
            const dataKey = getDataKey(curData);
            const { local, remote } = info;
            local.forEach(({publishID, audioLevel}) => {
                const userId = getUserIdFromPublishId(publishID);
                updateAndFireSpeaking(dataKey, userId, audioLevel > 0);
            });
            remote.forEach(({publishID, audioLevel}) => {
                const userId = getUserIdFromPublishId(publishID);
                updateAndFireSpeaking(dataKey, userId, audioLevel > 0);
            });
        },
        handleVideoReport(info) {
            // console.log('media service video report info: ', info);
            const    curData = getCurData();
            const    dataKey = getDataKey(curData);
            const    isVConf = CALL_TYPE.isVideoConf(curData.callType);
            const isVMonitor = CALL_TYPE.isVideoMonitor(curData.callType);
            const { local, remote } = info;
            local.forEach(({publishID, videoFrameWidth, videoFrameHeight, videoFPSSent, videoBitrate }) => {
                const userId = getUserIdFromPublishId(publishID);
                isVConf && updateAndFireVideoInfo(
                    dataKey, 
                    userId, 
                    {fps: videoFPSSent, width: videoFrameWidth, height: videoFrameHeight, bitRate: videoBitrate}
                );
            });
            remote.forEach(({publishID, videoFrameWidth, videoFrameHeight, videoFPSReceived, videoBitrate }) => {
                const     userId = getUserIdFromPublishId(publishID);
                (isVConf || isVMonitor) ? 
                updateAndFireVideoInfo(
                    dataKey, 
                    userId, 
                    {fps: videoFPSReceived, width: videoFrameWidth, height: videoFrameHeight, bitRate: videoBitrate}
                )
                :
                pipe(
                    curry(
                        (dataKey, statsInfo) => updateCallData(dataKey, { statsInfo })
                    )(dataKey),
                    fireVideoInfo(dataKey)
                )({fps: videoFPSReceived, width: videoFrameWidth, height: videoFrameHeight, bitRate: videoBitrate});
            });
        },
        handleJoined(users) {
            const curData = getCurData();
            const { previewed } = curData;
            const dataKey = getDataKey(curData);
            const callData = getCallData(dataKey);
            const { callType, fromUserId, toUserId, isReceive, members, renderHint } = callData;
            console.log('media service joined users: ', users, 'related data: ', curData, 'raw data: ', callData);
            //* 会议的通用操作
            const  dealConf = ({dataKey}) => { 
                addOrUpdateMyself(dataKey)();
                //* 语音元信息上报
                audioInfoReport({ enable: true });
            };
            //* 处理视频会议
            const dealVConf = ({dataKey, members, users}) => {
                users.forEach(user => {
                    const {userID, streams} = user;
                    const member = members[userID];
                    //! 只订阅邀请的成员，聚好看会把录制端也推送过来
                    member && streams.forEach(stream => {
                        const { layers } = stream;
                        const layerIndex = (member && member.isHost) ? layers[layers.length - 1].layerIndex : 0;
                        ifElse(
                            (member && member.renderHint),
                            () => subscribeStream({ ...stream, videoEle: member.renderHint, userID, layerIndex, muteAudio: false, muteVideo: false }),
                            () => fireSubsFailed(dataKey, {userId: userID, stream})
                        )();
                    })
                });
                dealConf({ dataKey });
                //* 视频元信息上报
                videoInfoReport({ enable: true });
            };
            //* 处理语音会议
            const dealAConf = ({dataKey, members, users}) => {
                users.forEach(user => {
                    const {userID, streams} = user;
                    const member = members[userID];
                    //! 只订阅邀请的成员，聚好看会把录制端也推送过来
                    member && streams.forEach(stream => {
                        subscribeStream({ ...stream, videoEle: null, userID })
                    })
                });
                dealConf({ dataKey });
            }
            //* 处理广播喊话
            const dealBdcst = ({dataKey}) => {
                updateTalkingAndFire(dataKey);
            }
            //* 处理通话
            const dealSingle = ({fromUserId, toUserId, isReceive, renderHint, users}) => users.forEach(user => {
                const {userID, streams} = user;
                const peerUserId = isReceive ? fromUserId : toUserId;
                (peerUserId === userID) && streams.forEach(stream => {
                    subscribeStream({ ...stream, videoEle: renderHint, userID });
                })
            });
            //* 处理视频通话
            const dealVideo = ({fromUserId, toUserId, isReceive, renderHint, users}) => {
                dealSingle({fromUserId, toUserId, isReceive, renderHint, users});
                videoInfoReport({ enable: true });
            }
            //* 处理强插和监听
            const   dealFIM = ({renderHint, users}) => users.forEach(user => {
                const {userID, streams} = user;
                streams.forEach(stream => {
                    subscribeStream({ ...stream, videoEle: renderHint, userID, muteAudio: false, muteVideo: true });
                })
            });
            //* 处理视频监控
            const dealVMonitor = ({dataKey, members, users}) => {
                users.forEach(user => {
                    const {userID, streams} = user;
                    const member = members[userID];
                    member && streams.forEach(stream => {
                        const layerIndex = getMaxStreamLayerIndex(stream);
                        ifElse(
                            member.renderHint,
                            () => {
                                subscribeStream({ ...stream, videoEle: member.renderHint, userID, layerIndex, muteAudio: member.mute, muteVideo: false });
                                updateAndFireStatus(dataKey, userID, MEM_STATUS.JOINED);
                            },
                            () => fireSubsFailed(dataKey, {userId: userID, stream})
                        )();
                    })
                });
                //* 视频元信息上报
                videoInfoReport({ enable: true });
            };
            //* 分类处理
            cond(
                [isVConf,    dealVConf   ],
                [isAConf,    dealAConf   ],
                [isVoice,    dealSingle  ],
                [isVideo,    dealVideo   ],
                [isInsert,   dealFIM     ],
                [isBodcst,   dealBdcst   ],
                [isMonitor,  dealFIM     ],
                [isVMonitor, dealVMonitor]
            )({ callType, dataKey, users, fromUserId, toUserId, isReceive, members, renderHint });
            curData.joined = true;
            //! 监听不推流
            previewed && doPublishStream(callType);
            //* 非视频监控，向信令服务器发送joinfinish
            notVMonitor({ callType }) && joinFinish(callData);
        },
        handleCameraPreview(open) {
            console.log('media service camera preview: ', open);
            if (open) {
                //* 预览成功且入房成功之后，在进行推流
                const               curData = getCurData();
                const  { callType, joined } = curData;
                curData.previewed = true;
                joined && doPublishStream(callType);
            }
        },
        handleSreenPreview(open, label) {
            console.log('media service screen preview: ', open, label);
        },
        handlePublished(publishID, streamType) {
            console.log('media service stream published: ', publishID, streamType);
        },
        handleSubscribed(subscribeID, publishID) {
            console.log('media service stream subscribed: ', publishID, subscribeID);
            const  curData = getCurData();
            const  dataKey = getDataKey(curData);
            console.log('media service stream subscribed related data: ', curData);
            //* 订阅HiRTC流之后，上报通话状态变更
            updateTalkingAndFire(dataKey);
            //* 更新成员的subscribeId，用于录制
            const  userId = getUserIdFromPublishId(publishID);
            const isGroup = CALL_TYPE.isGroup(curData.callType);
            isGroup ? updateMemberSubsId(dataKey, userId, subscribeID) : updateCallData(dataKey, { subscribeId: subscribeID });
        },
        handleSomeoneJoined(userID) {
            //* 加入房间，但还未推流
            console.log('media service someone joined: ', userID);
        },
        handleSomeoneLeft(userID) {
            //* 离开房间, 非会议对端离开，则上报对端离开的事件 
            console.log('media service someone left: ', userID);
            const  curData = getCurData();
            const  dataKey = getDataKey(curData);
            const callData = getCallData(dataKey);
            
            const dealVMonitor = ({members}) => {
                const member = members[userID];
                member && updateAndFireStatus(dataKey, userID, MEM_STATUS.QUIT);
            };
            cond(
                [isSingle,   peerLeave   ],
                [isVMonitor, dealVMonitor]
            )(callData);
        },
        handleStreamAdded(userID, stream) {
            console.log('media service stream added:', userID, stream);
            const curData = getCurData();
            const dataKey = getDataKey(curData);
            const callData = getCallData(dataKey);
            console.log('media service stream added related data:', callData);
            const { callType, fromUserId, toUserId, isReceive, members, renderHint } = callData;
            const  member = members[userID];
            const  isGroup = CALL_TYPE.isGroup(callType);
            const   video = isGroup ? (member && member.renderHint) : renderHint;
            //* 处理视频会议
            const dealVConf = ({video, userID, stream}) => video ? subscribeStream({videoEle: video, userID, ...stream, muteAudio: false, muteVideo: false}) : fireSubsFailed(dataKey, {userId: userID, stream})
            //* 处理语音会议
            const dealAConf = ({userID, stream}) => subscribeStream({videoEle: null, userID, ...stream})
            //* 处理语音通话
            const dealAudio = ({video, userID, stream, fromUserId, toUserId, isReceive}) => {
                const peerUserId = isReceive ? fromUserId : toUserId;
                (peerUserId === userID) && subscribeStream({videoEle: video, userID, ...stream});
            }
            //* 处理强插和监听
            const dealSingle = ({video, userID, stream}) => subscribeStream({videoEle: video, userID, ...stream});
            //* 处理视频通话
            const dealVideo = ({video, userID, stream}) => subscribeStream({videoEle: video, userID, ...stream, muteVideo: false, muteAudio: false});
            //* 处理视频监控
            const dealVMonitor = ({video, userID, stream}) => {
                const layerIndex = getMaxStreamLayerIndex(stream);
                then(
                    member,
                    ({video, userID, stream}) => {
                        subscribeStream({videoEle: video, userID, ...stream, layerIndex, muteAudio: member.mute, muteVideo: false});
                        updateAndFireStatus(dataKey, userID, MEM_STATUS.JOINED);
                    }
                )({video, userID, stream})
            };
            cond(
                [isVConf,    dealVConf   ],
                [isAConf,    dealAConf   ],
                [isVoice,    dealAudio   ],
                [isInsert,   dealSingle  ],
                [isMonitor,  dealSingle  ],
                [isVideo,    dealVideo   ],
                [isVMonitor, dealVMonitor]
            )({callType, video, userID, stream, fromUserId, toUserId, isReceive});
        },
        handleStreamRemoved(userID, publishID) {
            console.log('media service someone removed: ', userID, publishID);
        },
        handleStreamUpdated(userID, publishID, streamTrack, mute) {
            //* 对端调用muteLocal时通知
            console.log('media service stream updated: ', userID, publishID, streamTrack, mute);
            const curData = getCurData();
            const dataKey = getDataKey(curData);
            const isAudioTrack = HiRTC_STREAM_TRACK.isAudio(streamTrack);
            then(
                isAudioTrack,
                () => updateAndFireMute(dataKey, userID, !!mute)
            )();
        },
        handleDisconnected() {
            //* 与聚连信令服务器连接断开
            console.log('media service disconnected');
        },
        handleReconnected(users) {
            //* 重连
            console.log('media service  handleReconnected', users);
        },
        handleError(code, detail) {
            console.log('media service handleError', code, detail);
            const doHandle = handler => handler(detail);
            pipe(
                getHiHandler,
                doHandle
            )(code);
        }
    }
    const deviceHandlers = {
        handlePermission(audio, video, found, allowed) {
            const query      = audio && video;
            const notAllowed = fireErrorEvent(ERROR_EVENT.ASK_PMI_FAILED, ERROR_MSG.ASK_PMI_FAILED);
            const  noDevices = fireErrorEvent(ERROR_EVENT.NO_DEVICES, ERROR_MSG.NO_DEVICES); 
            const fundDevice = allowed => allowed ? getDeviceList() : notAllowed();
            const notFounded = query => query ? getPermission({ audio: false }) : video ? getPermission({ video: false }) : noDevices();
            found ? fundDevice(allowed) : notFounded(query);
        },
        handleDeviceList(info) {
            if (!info) {
                return
            }
            //TODO 检测 device 与 newDevice 的差异,提示设备插拔,和相应的操作
            const devices = deepCopy(info);
            setDevices(devices);
            console.log('media service get devides: ', devices);
        },
        handleDeviceChanged() {
            getDeviceList();
        },
    }
    const options = {
        debug: true,
        serviceID,
        serviceKey,
        Services,
        audio: true,
        video: true,
    };
    doInitHiRTC({handlers, deviceHandlers, options});
}

function initMonitorHiRTC({ 
    serviceID  = '90f4d5a954ab449e9b6aac92', 
    serviceKey = '2c17c6393771ee3048ae34d6b380c5ec', 
    Services   = {BasicRoomServiceToken: 'https://121.36.105.19:7080/v1/auth/token'}
} = {}) {
    const handlers = {
        handleVideoReport(info) {
            // console.log('media service video report info: ', info);
            const    curData = getMonitorCurData();
            const    dataKey = getDataKey(curData);
            const { remote } = info;
            remote.forEach(({publishID, videoFrameWidth, videoFrameHeight, videoFPSReceived, videoBitrate }) => {
                const userId = getUserIdFromPublishId(publishID); 
                updateAndFireVideoInfo(
                    dataKey, 
                    userId, 
                    {fps: videoFPSReceived, width: videoFrameWidth, height: videoFrameHeight, bitRate: videoBitrate}
                )
            });
        },
        handleJoined(users) {
            const curData = getMonitorCurData();
            const { previewed } = curData;
            const dataKey = getDataKey(curData);
            const callData = getCallData(dataKey);
            const { callType, members, renderHint } = callData;
            console.log('media service monitor joined users: ', users, 'related data: ', curData, 'raw data: ', callData);
            //* 处理视频监控
            const dealVMonitor = ({dataKey, members, users}) => {
                users.forEach(user => {
                    const {userID, streams} = user;
                    const member = members[userID];
                    member && streams.forEach(stream => {
                        const layerIndex = getMaxStreamLayerIndex(stream);
                        ifElse(
                            member.renderHint,
                            () => {
                                subscribeMonitorStream({ ...stream, videoEle: member.renderHint, userID, layerIndex, muteAudio: member.mute, muteVideo: false });
                                updateAndFireStatus(dataKey, userID, MEM_STATUS.JOINED);
                            },
                            () => fireSubsFailed(dataKey, {userId: userID, stream})
                        )();
                    })
                });
                //* 视频元信息上报
                videoMonitorInfoReport({ enable: true });
            };
            //* 分类处理
            cond(
                [isVMonitor, dealVMonitor]
            )({ callType, dataKey, users, members, renderHint });
            curData.joined = true;
            //! 监听不推流
            previewed && doPublishMonitorStream();
        },
        handleCameraPreview(open) {
            console.log('media service monitor camera preview: ', open);
            if (open) {
                //* 预览成功且入房成功之后，在进行推流
                const               curData = getMonitorCurData();
                const  { joined } = curData;
                curData.previewed = true;
                joined && doPublishMonitorStream();
            }
        },
        handleSreenPreview(open, label) {
            console.log('media service monitor screen preview: ', open, label);
        },
        handlePublished(publishID, streamType) {
            console.log('media service monitor stream published: ', publishID, streamType);
        },
        handleSubscribed(subscribeID, publishID) {
            console.log('media service monitor stream subscribed: ', publishID, subscribeID);
            const  curData = getMonitorCurData();
            const  dataKey = getDataKey(curData);
            console.log('media service stream subscribed related data: ', curData);
            //* 订阅HiRTC流之后，上报通话状态变更
            updateTalkingAndFire(dataKey);
            //* 更新成员的subscribeId，用于录制
            const  userId = getUserIdFromPublishId(publishID);
            const isGroup = CALL_TYPE.isGroup(curData.callType);
            isGroup ? updateMemberSubsId(dataKey, userId, subscribeID) : updateCallData(dataKey, { subscribeId: subscribeID });
        },
        handleSomeoneJoined(userID) {
            //* 加入房间，但还未推流
            console.log('media service monitor someone joined: ', userID);
        },
        handleSomeoneLeft(userID) {
            //* 离开房间, 非会议对端离开，则上报对端离开的事件 
            console.log('media service monitor someone left: ', userID);
            const  curData = getMonitorCurData();
            const  dataKey = getDataKey(curData);
            const callData = getCallData(dataKey);
            
            const dealVMonitor = ({members}) => {
                const member = members[userID];
                member && updateAndFireStatus(dataKey, userID, MEM_STATUS.QUIT);
            };
            cond(
                [isVMonitor, dealVMonitor]
            )(callData);
        },
        handleStreamAdded(userID, stream) {
            console.log('media service monitor stream added:', userID, stream);
            const  curData = getMonitorCurData();
            const  dataKey = getDataKey(curData);
            const callData = getCallData(dataKey);
            console.log('media service monitor stream added related data:', callData);
            const { callType, members } = callData;
            const  member = members[userID];
            const   video = member && member.renderHint;
            //* 处理视频监控
            const dealVMonitor = ({video, userID, stream}) => {
                const layerIndex = getMaxStreamLayerIndex(stream);
                then(
                    member,
                    ({video, userID, stream}) => {
                        subscribeMonitorStream({videoEle: video, userID, ...stream, layerIndex, muteAudio: member.mute, muteVideo: false});
                        updateAndFireStatus(dataKey, userID, MEM_STATUS.JOINED);
                    }
                )({video, userID, stream})
            };
            cond(
                [isVMonitor, dealVMonitor]
            )({callType, video, userID, stream});
        },
        handleStreamRemoved(userID, publishID) {
            console.log('media service monitor someone removed: ', userID, publishID);
        },
        handleStreamUpdated(userID, publishID, streamTrack, mute) {
            //* 对端调用muteLocal时通知
            console.log('media service monitor stream updated: ', userID, publishID, streamTrack, mute);
            const curData = getMonitorCurData();
            const dataKey = getDataKey(curData);
            const isAudioTrack = HiRTC_STREAM_TRACK.isAudio(streamTrack);
            then(
                isAudioTrack,
                () => updateAndFireMute(dataKey, userID, !!mute)
            )();
        },
        handleDisconnected() {
            //* 与聚连信令服务器连接断开
            console.log('media service monitor disconnected');
        },
        handleReconnected(users) {
            //* 重连
            console.log('media service monitor handleReconnected', users);
        },
        handleError(code, detail) {
            console.log('media service monitor handleError', code, detail);
            const doHandle = handler => handler(detail);
            pipe(
                getHiHandler,
                doHandle
            )(code);
        }
    }
    const deviceHandlers = {
        handlePermission(audio, video, found, allowed) {
            const query      = audio && video;
            const notAllowed = fireErrorEvent(ERROR_EVENT.ASK_PMI_FAILED, ERROR_MSG.ASK_PMI_FAILED);
            const  noDevices = fireErrorEvent(ERROR_EVENT.NO_DEVICES, ERROR_MSG.NO_DEVICES); 
            const fundDevice = allowed => allowed ? getMonitorDeviceList() : notAllowed();
            const notFounded = query => query ? getPermission({ audio: false }) : video ? getPermission({ video: false }) : noDevices();
            found ? fundDevice(allowed) : notFounded(query);
        },
        handleDeviceList(info) {
            if (!info) {
                return
            }
            //TODO 检测 device 与 newDevice 的差异,提示设备插拔,和相应的操作
            const devices = deepCopy(info);
            setDevices(devices);
            console.log('media service monitor get devides: ', devices);
        },
        handleDeviceChanged() {
            getMonitorDeviceList();
        },
    }
    const options = {
        debug: true,
        serviceID,
        serviceKey,
        Services,
        audio: true,
        video: true,
    };
    doInitMonitorHiRTC({handlers, deviceHandlers, options});
}

/**
** 发布本地流 
*/
function doPublishStream(callType) {
    publishStream();
    //! 视频监控发布，但是不推流，开启反向喊话，启动推流
    const isVMonitor = CALL_TYPE.isVideoMonitor(callType);
    then(
        isVMonitor,
        functionalize(muteLocalA, { muteAudio: true })
    )(callType);
}

/**
** 发布本地流 
*/
function doPublishMonitorStream() {
    publishMonitorStream();
    //! 视频监控发布，但是不推流，开启反向喊话，启动推流
    muteMonitorLocalA({ muteAudio: true });
}

/**
** 上报对端流订阅失败 
*/
function fireSubsFailed(dataKey, { userId, stream }) {
    console.error('media service steam subscribed failed: ', userId, stream);
    const   result = ERROR_MSG.SUBS_FAILED10;
    result.extra.push({userId, stream});
    const  subFail = pipe(
        subscribeFailedEvent(dataKey, result),
        fireCallEvent(dataKey)
    );
    subFail();  
}
/**
** 聚连sdk错误处理函数
*/
function getHiHandler(code) {
    const handlers = {};
    handlers[HiRTC_ERROR_CODE.PARAM_ERROR] = function paramError(detail) {
        const { desc } = detail
        console.log(`media service ParamsError: ${desc}`);
    }
    handlers[HiRTC_ERROR_CODE.JOIN_ERROR] = function joinError(detail) {
        const { desc } = detail
        console.log(`media service JoinError: ${desc}`);
    }
    handlers[HiRTC_ERROR_CODE.PREVIEW_ERROR] = function previewError(detail) {
        const { desc } = detail
        console.log(`media service PreviewError: ${desc}`);
    }
    handlers[HiRTC_ERROR_CODE.PUBLISH_ERROR] = function publishError(detail) {
        const { type, desc, tag, publishID } = detail
        // 发布前publishID为空，发布后publishID有值
        console.log(`media service PublishError: ${type, tag, publishID, desc}`)
    }
    handlers[HiRTC_ERROR_CODE.SUBSCRIBE_ERROR] = function subscribeError(detail) {
        const { publishID, subscribeID, desc } = detail
        // 订阅前subscribeID为空，订阅后subscribeID有值
        console.log(`media service SubscribeError: ${publishID, subscribeID, desc}`)
    }
    handlers[HiRTC_ERROR_CODE.SELECT_DEVICE_ERROR] = function selectDeviceError(detail) {
        const { desc } = detail
        console.log(`media service SelecteDeviceError: ${desc}`);
    }
    handlers[HiRTC_ERROR_CODE.RECORD_ERROR] = function recordError(detail) {
        const { desc } = detail
        console.log(`media service RecordError: ${desc}`)
    }
    handlers[HiRTC_ERROR_CODE.CAPTURE_ERROR] = function captureError(detail) {
        const { desc } = detail
        console.log(`media service CaptureError: ${desc}`)
    }
    return handlers[code];
}

/**
** 逆初始化
**   1. 信令通知要断开
*todo    2. 关闭存在的通话
*todo    3. 清空全局数据
*/
export function unInitMediaSdk() {
    unInitSignallingService();
    pipe(
        getSocket,
        socket => socket.close()
    )();
}
/**
** 信令处理回调 
*/
function signalingFireEvent(event, data) {
    // console.log('media service signaling fire event:', data);
    const doHandle = handler => handler(data);
    pipe(
        getSignalingHandler, 
        doHandle
    )(event);
}
/**
** 获取不同信令的处理函数 
*/
function getSignalingHandler(event) {
    const handlers = {};
    handlers[SocketJS.MESSAGE] = handleSocketMessage;
    handlers[SocketJS.ERROR]   = handleSocketError;
    handlers[SocketJS.OPEN]    = handleSocketOpen;
    handlers[SocketJS.CLOSED]  = handleSocketClose;
    return handlers[event];
}
/**
** 处理websocket消息
*/
function handleSocketMessage(data) {
    console.log('media service handle socket message: ', data);
    Either.of(data.sig)
    .map(sig     => getHandler(sig))
    .map(handler => handler(data));
}
function handleSocketOpen(data) {
    pipe(
        fireSigConnected(),
        () => console.log('media service websocket连接创建成功', data)
    )()
}
/**
** 上报连接断开事件
*/
function handleSocketError(_data) {
    //todo 暂时无用
    pipe(
        fireSigDisconnected(),
        () => console.error('media service websocket连接异常: ', _data)
    )();
}

function handleSocketClose(_data) {
    //todo 暂时无用
    pipe(
        fireSigDisconnected(),
        () => console.error('media service websocket连接异常: ', _data)
    )();
}
/**
** 注册处理信令的回调
**   1. ack相关的消息只有出错时才会收到
*/
function registerSignalingHandler() {
    function connectACK(data) {
        sigConnected(data);
    }
    function createACK(data) {
        createFailed(data);
    }
    function disconnACK(data) {
        console.error('media service 连接断开失败:', data);
    }
    function newPeer(data) {
        const out = DIRECTION.callOut(data.callOut);
        out ?
        callOut(data):
        callIn(data);
    }
    function offerACK(data) {
        offerFailed(data);
    }
    function answer(data) {
        //! 对讲/广播喊话采用自己封装的webrtc库，sdp协商成功，上报talking状态
        console.log('media service 收到answer: ', data);
        const dataKey = getRawDataKey(data);
        Either.of(data.code === ACK_CODE.SUCCESS)
        .map(() => setPttRemoteDescription(data))
        .map(() => joinFinish(data))
        .map(() => updateTalkingAndFire(dataKey))
        .map(() => pipe(getCallData, queryMembers)(dataKey));
    }
    function publish(data) {
        createRecvPeerConnections(data);
    }
    function updateOpt(data) {
        updateOptHandler(data);
    }
    function reject(data) {
        peerReject(data);
    }
    function accept(data) {
        peerAccept(data);
    }
    function leave(data) {
        peerLeave(data);
    }
    function destroy(data) {
        peerDestroy(data);
    }
    function ring(data) {
        
    }
    function cancel(data) {
        peerLeave(data);
    }
    function mute(data) {
        pttFreeSuccess(data);
    }
    function unmute(data) {
        pttGrabSuccess(data);
    }
    function graback(data) {
        pttGrabFailed(data);
    }
    function freeack(data) {
        pttFreeFailed(data);
    }
    function joinstate(data) {
        memJoinState(data);
    }
    function monitorack(data) {
        monitorOpt(data);
    }
    function notifyWeb(data) {
        tmlStatus(data);
    }
    function msgArrive(data) {
        receiveMessage(data);
    }

    registerHandler(SIG_TYPE.CONNECT_ACK, connectACK);
    registerHandler(SIG_TYPE.DISCON_ACK,  disconnACK);
    registerHandler(SIG_TYPE.CREATE_ACK,  createACK );
    registerHandler(SIG_TYPE.NEW_PEER,    newPeer   );
    registerHandler(SIG_TYPE.OFFERACK,    offerACK  );
    registerHandler(SIG_TYPE.ANSWER,      answer    );
    registerHandler(SIG_TYPE.PUBLISH,     publish   );
    registerHandler(SIG_TYPE.UPDATE_OPT,  updateOpt );
    registerHandler(SIG_TYPE.REJECT,      reject    );
    registerHandler(SIG_TYPE.ACCEPT,      accept    );
    registerHandler(SIG_TYPE.LEAVE,       leave     );
    registerHandler(SIG_TYPE.DESTROY,     destroy   );
    registerHandler(SIG_TYPE.RING,        ring      );
    registerHandler(SIG_TYPE.CANCEL,      cancel    );
    registerHandler(SIG_TYPE.MUTE,        mute      );
    registerHandler(SIG_TYPE.UNMUTE,      unmute    );
    registerHandler(SIG_TYPE.FREE_ACK,    freeack   );
    registerHandler(SIG_TYPE.GRAB_ACK,    graback   );
    registerHandler(SIG_TYPE.JOIN_STATE,  joinstate );
    registerHandler(SIG_TYPE.NOTIFY_WEB,  notifyWeb );
    registerHandler(SIG_TYPE.MONITOR_ACK, monitorack);
    registerHandler(SIG_TYPE.MESSAGE,     msgArrive );
}
/**
** 注册处理创建相关的action
*/
function registerActions() {
    registerAction(CALL_TYPE.VOICE,            createVoiceCall      );
    registerAction(CALL_TYPE.VOICE_CONFERENCE, createVoiceConference);
    registerAction(CALL_TYPE.PTT,              createPtt            );
    registerAction(CALL_TYPE.TEMP_PTT,         createTempPtt        );
    registerAction(CALL_TYPE.BROADCAST,        createBroadcast      );
    registerAction(CALL_TYPE.FORCE_INSERT,     forceInsertCall      );
    registerAction(CALL_TYPE.FORCE_MONITOR,    forceMonitorCall     );
    registerAction(CALL_TYPE.VIDEO,            createVideoCall      );
    registerAction(CALL_TYPE.VIDEO_CONFERENCE, createVideoConference);
    registerAction(CALL_TYPE.VIDEO_MONITOR,    createVideoMonitor   );
}
/**
 ** SDP协商错误
 */
function offerFailed(data) {
    console.error('media service 收到offer ack', data);
    const dataKey = getRawDataKey(data);
    const changeEvent = sdpFailedEvent(dataKey);
    const   fireEvent = fireCallEvent(dataKey);
    pipe(
        changeEvent,
        fireEvent
    )();
}

/**
*! 获取创建媒体的约束条件，除对讲/临时对讲外，其他均需要创建两个PeerConnection
*/
function getConstraints(audioOnly) {
    const constraints = {
        audio: true,
        video: MEDIA_TRACK.all(audioOnly),
    }
    return constraints;
}
/**
 ** 收到控制服务的newpeer消息，开始创建推流PeerConnection
 */
function createPttPeerConnection(data) {
    const { audioOnly } = data;
    const       dataKey = getRawDataKey(data);
    const   constraints = getConstraints(audioOnly);

    createAudioMedia(constraints)
    .map(({pc, offer}) => {
        muteAudioStream(pc, false);
        return setPttPeerCallback(data, { pc, offer })
    })
    .map(({pc, offer}) => {
        //* 保存Send PeerConnection
        //* 发送offer
        updateSendPeerConnection(dataKey, pc);
        sendOfferSignalling(data, offer);
    })
    .fork((err) => {
        console.error('media service craete ptt media error:', err);
    }, (data) => {
        console.log('media service create ptt media:', data);
    })
}

/**
 ** 收到控制服务的newpeer消息，开始创建推流PeerConnection
 */
 function createBodcstPeerConnection(data) {
    const { audioOnly } = data;
    const       dataKey = getRawDataKey(data);
    const   constraints = getConstraints(audioOnly);

    createAudioMedia(constraints)
    .map(({pc, offer}) => {
        muteAudioStream(pc, true);
        return setPttPeerCallback(data, { pc, offer })
    })
    .map(({pc, offer}) => {
        //* 保存Send PeerConnection
        //* 发送offer
        updateSendPeerConnection(dataKey, pc);
        sendOfferSignalling(data, offer);
    })
    .fork((err) => {
        console.error('media service craete broadcast media error:', err);
    }, (data) => {
        console.log('media service create broadcast media:', data);
    })
}

/**
 *! 暂时无用
 ** 收到控制服务的publish消息，开始创建拉流PeerConnection
 *! 对讲/喊话不会收到publish
 */
function createRecvPeerConnections(data) {
    const { 
        audioOnly, 
        callType, 
        memberList 
    } = data;
    const dataKey = getRawDataKey(data);
    let     tasks = Task.of(0);

    memberList
    .forEach(member => {
        const pc = getRecvPeerConnectionById(dataKey, member);
        //* 已存在，则不需要创建
        Either.of(!pc)
        .map(() => {
            const task = createRecvPeerConnection(data);
            task
            .map(({pc, offer}) => setReceiveCallback(data, { pc, offer }))
            .map(({pc, offer}) => {
                updateRecvPeerConnection(dataKey, member, pc);
                //* 发送offer
                recvOfferSignalling(data, offer, member);
            });
            tasks = tasks.concat(task);
        })
    });

    tasks
    .fork(
        (eror) => {
            console.error('media service craete receive media error:', eror);
        }, 
        (data) => {
            const voice = CALL_TYPE_RAW.isVoice(callType);
            const video = voice && MEDIA_TRACK.all(audioOnly);
            //* CONFERENCE/TEMP_PTT/PTT/BROADCAST类型，此时上报TALKING, VOICE类型收到ACCEPT时在上报
            !voice && updateTalkingAndFire(dataKey);
            //* 视频通话，开始上报视频统计信息
            video && startVideoInfoTimer(dataKey);
            console.log('media service create receive media:', data);
        }
    );
}
/**
*! 使用聚连的sdk，暂时无用 
*/
function startVideoInfoTimer(dataKey) {
    const updateTimer = 
    curry(
        (dataKey, videoInfoTimer) => updateCallData(dataKey, {videoInfoTimer})
    )(dataKey);
    pipe(
        videoInfoTimer,
        updateTimer
    )(dataKey);
}
/**
*! 使用聚连的sdk，暂时无用 
*/
function stopVideoInfoTimer(dataKey) {
    return clearVideoInfoTimer(dataKey);
}
/**
*! 使用聚连的sdk，暂时无用 
*/
function videoInfoTimer(dataKey) {
    const infoTimer = setInterval(() => {
        videoStatsInfo(dataKey)
        .then((stats) => {
            const updateInfo = 
            curry(
                (dataKey, statsInfo) => updateCallData(dataKey, { statsInfo })
            )(dataKey);
            pipe(
                formatVideoStatsIndo,
                updateInfo,
                fireVideoInfo(dataKey)
            )(stats);
        })
        .catch((err) => {
            console.error('media service get video info error:', err);
        });
    }, TIMER_S.TWO);
    return infoTimer;
}
/**
*! 使用聚连的sdk，暂时无用 
*/
function formatVideoStatsIndo(stats) {
    const { bitRate, framesPerSecond, packetsLost, packetsReceived, width, height } = stats;
    const statsInfo = {
        bitRate:     (bitRate / 1024).toFixed(2),
        fps:         framesPerSecond,
        packageLost: (packetsLost * 100 / packetsReceived).toFixed(2),
        resolution:  width && height ? `${width}*${height}` : '',
    }
    return statsInfo;
}

/**
** 创建PeerConnection的Task
*/
function createRecvPeerConnection(data) {
    const { audioOnly } = data;
    const   constraints = getConstraints(audioOnly);
    return createReceiveMedia(constraints);
}

function setPttRemoteDescription(data) {
    setSendRemoteDescription(data);
}
function setPttPeerCallback(data, { pc, offer }) {
    function ontrack(event) {
        const    getStream = event => event.streams[0];
        const      dataKey = getRawDataKey(data);
        const mediaElement = getMediaElement(dataKey);
        const attachAtream = curry((element, stream) => element.srcObject = stream)(mediaElement);
        pipe(getStream, attachAtream)(event);
    }
    setMediaOnTrack(pc, ontrack);
    return { pc, offer };
}
/**
 ** 设置对端会话描述 
 */
function setRemoteDescription(data) {
    const isSendAnswer = data.peerId === data.roomId;
    isSendAnswer ? setSendRemoteDescription(data) : setReceiveRemoteDescription(data);
}
/**
 ** 设置发送PeerConnection的对端会话描述
 */
function setSendRemoteDescription(data) {
    const        dataKey = getRawDataKey(data);
    const setDescription = curry(setMediaRemoteDescription)(data.sdp);
    pipe(getSendPeerConnection, setDescription)(dataKey);
}
/**
 ** 设置接收PeerConnection的对端会话描述
 */
function setReceiveRemoteDescription(data) {
    const        dataKey = getRawDataKey(data);
    const setDescription = curry(setMediaRemoteDescription)(data.sdp);
    const          getPC = curry(getRecvPeerConnectionById)(dataKey);
    pipe(getPC, setDescription)(data.peerId);
}
/**
 ** 设置Receive PeerConnection的回调参数
*/
function setReceiveCallback(data, { pc, offer }) {
    function ontrack(event) {
        const    getStream = event => event.streams[0];
        const      dataKey = getRawDataKey(data);
        const mediaElement = getMediaElement(dataKey);
        const attachAtream = curry((element, stream) => element.srcObject = stream)(mediaElement);
        pipe(getStream, attachAtream)(event);
    }
    setMediaOnTrack(pc, ontrack );
    return { pc, offer };
}
/**
** 发送joinfinish信令，报告加入完成 
*/
function joinFinish(data) {
    const dataKey = getRawDataKey(data);
    pipe(getCallData, sendJoinFinish)(dataKey);
}
/**
** 信令服务器是否连接上报
*/
function sigConnected(data) {
    ifElse(
        data.code === ACK_CODE.SUCCESS,
        () => console.log('media service 连接创建成功', data),
        () => console.error('media service 连接创建失败', data)
    )();
}

/**
 ** 通话创建失败
 */
function createFailed(data) {
    const { code } = data;
    Either.of(code !== ACK_CODE.SUCCESS)
    .map(() => {
        console.error('media service 通话创建失败: ', data)
        const  result = { code, msg: ACK_TEXT[code] };
        const dataKey = getRawDataKey(data);
        pipe(
            callStateFailed(dataKey, result),
            fireStateEvent(dataKey)
        )();
    });
}

/**
 ** newpeer被叫
 */
function callIn(data) {
    const { audioOnly } = data;
    MEDIA_TRACK.all(audioOnly) ?
    videoCallIn(data):
    voiceCallIn(data);
}

/**
 ** newpeer主叫
 */
function callOut(data) {
    const {
        code,
        audioOnly, 
        callType: rawCallType,
        fromUserId,
        roomId, 
        toUserId 
    } = data;
    const isSingle = [CALL_TYPE_RAW.VOICE].includes(rawCallType);
    const callType = RAW_CALL_TYPE_2_CALL_TYPE[rawCallType + audioOnly];
    const  dataKey = isSingle ? `${fromUserId}@${toUserId}` : `${callType}@${fromUserId}`;
    const ringWait = callStateRingWait(dataKey);
    const callData = getCallData(dataKey);
    const { 
        userId: userID, userName 
    } = getUserData();
    Object.assign(callData, { roomId });
    //* 是否需要视频媒体
    const publishVideo = CALL_TYPE.publishVideo(callType);
    const selectDevices = pipe(
        getDefaultDevices,
        ifElse(
            publishVideo,
            selectVideoDevices,
            selectAudioDevices,
        )
    );
    //! 监听: 不预览、不推流，视频监控需要推音频流用于反向喊话
    const previewLocal = then(
        CALL_TYPE.needPreview(callType),
        previewStart
    )
    //* 上报roomId
    const fireRoomId = fireRoomIdEvent(dataKey);
    const  isPtt = () => CALL_TYPE.isPttAll(callType);
    const  isBod = () => CALL_TYPE.isBroadcast(callType);
    const notPtt = () => !CALL_TYPE.isPttAll(callType) && !CALL_TYPE.isBroadcast(callType);  
    const commonAction = () => {
        updateRoomId(dataKey, roomId);
        fireRoomId();
        ringWait();
        changeDataKey2RoomId(dataKey)
    }
    //! 针对对讲，采用自己的webrtc的封装库
    const pttAction = pipe(
        commonAction,
        () => createPttPeerConnection(data)
    );
    //! 针对广播喊话，采用自己的webrtc的封装库
    const bdcstAction = pipe(
        commonAction,
        () => createBodcstPeerConnection(data)
    );
    //! 对讲讲以外的其他类型通话使用HiRTC
    const otherAction = pipe(
        commonAction,
        () => {
            selectDevices();
            previewLocal({ video: callData.previewHint });
            joinRoom({ callData: getCallData(roomId), userID, userName });
        }
    );
    const doAction = cond(
        [isPtt,    pttAction  ],
        [isBod,    bdcstAction],
        [notPtt,   otherAction]
    )
    then(
        code === ACK_CODE.SUCCESS,
        doAction
    )();
}

/**
** 对端接听，会议要通知更新会议成员
*/
function peerAccept(data) {
    console.log('media service peer accepted: ', data);
    const dataKey = getRawDataKey(data);
    updateTalkingAndFire(dataKey);
    //! 如果是会议，则需要更新会议成员，成员不存在则添加，已存在则更新状态
    const { callType, fromUserId: callNo, fromUserName: name } = data;
    const isConf = CALL_TYPE_RAW.isConf(callType);
    const dealConf = addOrUpdateConfMem({ dataKey, callNo, callType, name });
    then(
        isConf,
        dealConf
    )();
}
/**
** 变更通话TALKING状态，并上报
*/
function updateTalkingAndFire(dataKey) {
    pipe(
        callStateTalking(dataKey),
        fireStateEvent(dataKey)
    )();
}
/**
** 添加或者更新会议成员
*/
function addOrUpdateConfMem({ dataKey, callNo, callType, name, status = MEM_STATUS.JOINED} = {}) {
    const member = getConfMemByNo(dataKey, callNo);
    const isQuit = MEM_STATUS.isQuit(status);
    const isRejt = MEM_STATUS.isRejected(status);
    //* 更新并上报
    const updateAndFireStatus = pipe(
        () => updateMemberStatus(dataKey, callNo, status),
        confMemUpdateEvent(dataKey),
        fireMemberUpdate(dataKey)
    );
    //* 添加并上报
    const addAndFire = pipe(
        () => addConfMember(dataKey, { callNo, name, callType }),
        confMemAcceptEvent(dataKey),
        fireMemberUpdate(dataKey)
    );
    //! 成员存在则更新其状态，成员不存在且成员状态不是 已退出/已拒绝 状态，添加成员
    const dealConf = ifElse(
        !!member,
        updateAndFireStatus,
        then(
            !isQuit && !isRejt,
            addAndFire
        )
    )
    return dealConf;
}
/**
** 将自己加入会议成员 
*/
function addOrUpdateMyself(dataKey) {
    const { userId: callNo, userName: name } = getUserData();
    const { callType } = getCallData(dataKey);
    return addOrUpdateConfMem({ dataKey, callNo, name, callType });
}

/**
 ** 对端拒绝
 */
function peerReject(data) {
    console.log('media service peer rejected: ', data);
    const { callType, fromUserId: callNo } = data;
    const  isConf = CALL_TYPE_RAW.isConf(callType);
    const dataKey = getRawDataKey(data);
    //! 如果是会议，则需要更新会议成员
    ifElse(
        isConf,
        pipe(
            () => delConfMember(dataKey, [callNo]),
            confMemRefuseEvent(dataKey),
            fireMemberUpdate(dataKey)
        ),
        pipe(
            callStateReject(dataKey),
            fireStateEvent(dataKey),
            deleteCallData(dataKey),
            leaveHiRTC(dataKey),
        )
    )(dataKey);
}

/**
 ** 对端结束通话 
 */
function peerLeave(data) {
    const      dataKey = getRawDataKey(data);
    const     callData = getCallData(dataKey);
    const    fireState = fireStateEvent(dataKey);
    const    dealVideo = dealVideoLeave(dataKey);            //* 清理定时器
    const    dealVoice = dealVoiceLeave(dataKey);            //* 结束录音
    const   leaveRoom_ = leaveHiRTC(dataKey);                //* 离开HiRTC房间
    const  changeState = callStateBye(dataKey);
    const  delCallData = deleteCallData(dataKey);
    const sendLeaveMsg = functionalize(                      //* 离开信令
        pipe(getCallData, leave), 
        dataKey
    );
    //* 只处理通话，不处理会议
    then(
        callData && CALL_TYPE.isSingle(callData.callType),
        pipe(
            changeState,
            fireState,
            dealVideo,
            dealVoice,
            leaveRoom_,
            sendLeaveMsg,
            delCallData
        )
    )(dataKey);
}
/**
*todo 处理录制等问题 
*/
function dealVideoLeave(dataKey) {
    const callData = getCallData(dataKey);
    const callType = callData ? callData.callType : CALL_TYPE.NONE;
    const fileName = callData ? getFileName(callData.fromUserName, callData.toUserName) : '';
    return CALL_TYPE.isVideo(callType) ? () => stopRecordStream(dataKey, callData.callNo, fileName) : identity;     
}
/**
*todo 处理录制等问题 
*/
function dealVoiceLeave(dataKey) {
    const callData = getCallData(dataKey);
    const callType = callData ? callData.callType : CALL_TYPE.NONE;
    const fileName = callData ? getFileName(callData.fromUserName, callData.toUserName) : '';
    return CALL_TYPE.isVoice(callType) ? () => stopRecordStream(dataKey, callData.callNo, fileName) : identity;
}
/**
** 结束对讲，并释放话权
*/
function dealPttDestroy(dataKey) {
    const {callType} = getCallData(dataKey);
    const      isPtt = CALL_TYPE.isPttAll(callType);
    return     isPtt ? functionalize(freeSpeak, dataKey) : identity;
}

/**
 ** 对端结束会议/对讲
 */
function peerDestroy(data) {
    const  {callType} = data;
    const       isPtt = CALL_TYPE_RAW.isPttAll(callType);
    const     dataKey = getRawDataKey(data);
    const     freePtt = dealPttDestroy(dataKey);
    const   fireState = fireStateEvent(dataKey);
    const  leaveRoom_ = leaveHiRTC(dataKey);
    const changeState = callStateBye(dataKey);
    const delCallData = deleteCallData(dataKey);
    const closePttPC  = then(
        isPtt,
        functionalize(closeSendPC, dataKey)
    ) 
    pipe(
        freePtt,
        leaveRoom_,
        changeState,
        fireState,
        closePttPC,
        delCallData
    )(dataKey);
}
/**
 ** 上报抢话成功
 */
function pttGrabSuccess(data) {
    console.log('media service ptt grab success:', data);
    const { fromUserId } = data;
    const  { userId } = getUserData();
    const     dataKey = getRawDataKey(data);
    const changeEvent = grabSuccessEvent(dataKey);
    const   fireEvent = fireCallEvent(dataKey);
    const  muteStream = partial(muteAudioStream, undefined, true);
    pipe(
        changeEvent,
        fireEvent
    )();
    updateAndFireMute(dataKey, fromUserId, false);
    then(
        userId === fromUserId,
        pipe(
            getSendPeerConnection,
            muteStream
        )
    )(dataKey);
}
/**
** 抢话失败上报 
*/
function pttGrabFailed(data) {
    const     dataKey = getRawDataKey(data);
    const changeEvent = grabFailedEvent(dataKey);
    const   fireEvent = fireCallEvent(dataKey);
    pipe(
        changeEvent,
        fireEvent
    )();
}

function pttFreeSuccess(data) {
    console.log('media service ptt free success:', data);
    const { fromUserId } = data;
    const  { userId } = getUserData();
    const     dataKey = getRawDataKey(data);
    const changeEvent = freeSuccessEvent(dataKey);
    const   fireEvent = fireCallEvent(dataKey);
    const  muteStream = partial(muteAudioStream, undefined, false);
    pipe(
        changeEvent,
        fireEvent
    )();
    updateAndFireMute(dataKey, fromUserId, true);
    then(
        userId === fromUserId,
        pipe(
            getSendPeerConnection,
            muteStream
        )
    )(dataKey);
}
/**
** 释放话权失败
*/
function pttFreeFailed(data) {
    const     dataKey = getRawDataKey(data);
    const changeEvent = freeFailedEvent(dataKey);
    const   fireEvent = fireCallEvent(dataKey);
    pipe(
        changeEvent,
        fireEvent
    )();
}
/**
 ** 会议更新成员状态，并上报 
 */
function memJoinState(data) {
    console.log('media service member joinstate changed: ', data);
    const { fromUserId: callNo, fromUserName: name, callType, result } = data;
    const         isPtt = CALL_TYPE_RAW.isPttAll(callType);
    const        isConf = CALL_TYPE_RAW.isConf(callType);
    const      isBodcst = CALL_TYPE_RAW.isBroadcast(callType);
    const        status = STATUS_2_MEM_STATUS[result];
    const       dataKey = getRawDataKey(data);
    const      callData = getCallData(dataKey)
    const updateAndFire = addOrUpdateConfMem({ dataKey, callNo, callType, name, status });
    const quitDelMember = then(
        MEM_STATUS.isQuit(status),
        () => delConfMember(dataKey, [callNo])
    );
    const quitResetMedia = then(
        MEM_STATUS.isQuit(status),
        () => resetMemMediaEle(dataKey, callNo)
    );
    //! 仅会议成员上报
    //todo 使用 cond 分类处理
    ifElse(
        !!callData,
        then(
            isConf || isPtt || isBodcst,
            pipe(
                quitResetMedia,
                updateAndFire,
                quitDelMember
            )
        ),
        fnLog('media service group is not existed, can not update the state of member', data)
    )();
}
/**
** 处理对讲组活跃以及终端在线状态上报
*/
function tmlStatus({ uid, onlineState, type, roomId }) {
    console.log(`media service terminal userId: ${uid}, status: ${onlineState}, type: ${type}, roomId: ${roomId}`);
    const  vMonitorRoomId = getVideoMonitorRoomId();
    const     monitorData = getCallData(vMonitorRoomId);
    const    dealVMonitor = then(
                                (ONLINE_STATE.isOffline(onlineState) && monitorData && monitorData.members[uid]),
                                () => updateAndFireStatus(vMonitorRoomId, uid, MEM_STATUS.QUIT)
                            );
    const       dealGroup = firePttActive(roomId);
    const      dealOnline = pipe(
                                fireTmlStatus(uid, onlineState),
                                dealVMonitor
                            );
    const  isGroupNotify = () => NOTIFY_TYPE.isGroupNotify(type);
    const isOnlineNotify = () => NOTIFY_TYPE.isOnlineNotify(type);
    cond(
        [isGroupNotify,  dealGroup ],
        [isOnlineNotify, dealOnline]
    )();
}

/**
** 自定义消息上报 
*/
function receiveMessage(data) {
    console.log('media service receive custom message:', data);
    const isMonitorResp = ({childMsgType}) => childMsgType === CHILD_MSG_TYPE.DaRtmpSResp;
    const      otherMsg = ({childMsgType}) => childMsgType !== CHILD_MSG_TYPE.DaRtmpSResp;
    cond(
        [isMonitorResp, dealMonitorResp        ],
        [otherMsg,      fireCustomMessage(data)]
    )(data);
}

function dealMonitorResp(data) {
    const startFailed = ({result}) => result !== '0';
    const vMonitorRoomId = getVideoMonitorRoomId();
    then(
        startFailed,
        ({srcId}) => updateAndFireStatus(vMonitorRoomId, srcId, MEM_STATUS.QUIT)
    )(data);
}

/**
** 加入监控后，禁止推本地音频流
*/
function monitorOpt({code, type} = {}) {
    const canPush = ({code, type}) => ACK_CODE.success(code) && MONITOR_OPT.isPublish(type);
    then(
        canPush,
        functionalize(muteMonitorLocalA, { muteAudio: false })
    )({code, type});
}

function closeSendPC(dataKey) {
    pipe(
        getSendPeerConnection,
        closePeerConnection
    )(dataKey);
}

function closeRecvPC(dataKey) {
    const closePC = pcs => Object.values(pcs).forEach(pc => closePeerConnection(pc));
    pipe(
        getRecvPeerConnections,
        closePC
    )(dataKey);
}

/**
 ** 处理发送 GROUP_OPT 以及 CALL_OPT 之后，收到的服务端的回复 
 */
function updateOptHandler(data) {
    console.log('media service update option:', data);
    const doHandle = handler => handler(data);
    pipe(getOptHandler, doHandle)(data.type);
}
function getOptHandler(opt) {
    const handlers = {};
    handlers[GROUP_OPT.QUERY_MEMBERS] = groupQueryMemebr;
    handlers[GROUP_OPT.ADD_MEMBER]    = groupAddMember;
    handlers[GROUP_OPT.DEL_MEMBER]    = groupDeleteMember;
    handlers[GROUP_OPT.MUTE]          = groupMuteMember;
    handlers[GROUP_OPT.UNMUTE]        = groupUnmuteMember;
    handlers[GROUP_OPT.ONLINE]        = groupOnlineMember;
    return handlers[opt];
}
/**
 ** 服务端返回数据data，其中：
 ** ***totalMemberList*** 全部成员
 ** ***onlineMemberList*** 入会成员
 */
function groupQueryMemebr(data) { 
    const { totalMemberList, onlineMemberList } = data;
    const  getIds = members => members.map(member => member.split('_')[0]);
    const dataKey = getRawDataKey(data);
    const  update = ({dataKey, totalMemberList, onlineMemberList}) => updateConfMembers(dataKey, totalMemberList, onlineMemberList);
    pipe(
        ({dataKey, totalMemberList, onlineMemberList}) => ({dataKey, totalMemberList: getIds(totalMemberList), onlineMemberList: getIds(onlineMemberList)}),
        update,
        confMemUpdateEvent(dataKey),
        fireMemberUpdate(dataKey)
    )({dataKey, totalMemberList, onlineMemberList});
}
/**
** 会议邀请 
*/
function groupAddMember() {
    //! 该操作已废弃，会议加人通过newpeer信令，通知其他在会成员通过joinstate
}
/**
** 会议踢出 
*/
function groupDeleteMember(data) {
    console.log('media service user kicked from group: ', data);
    const dataKey = getRawDataKey(data);
    const changeEvent = confMemKickeEvent(dataKey);
    const   fireEvent = fireCallEvent(dataKey);
    pipe(
        changeEvent,
        fireEvent
    )();
}
/**
** 禁言成员上报
*/
function groupMuteMember(data) {
    const { roomId: dataKey } = data;
    const { userId: targetId } = getUserData();
    muteLocalA({ muteAudio: true });
    updateAndFireMute(dataKey, targetId, true);
}

function groupUnmuteMember(data) {
    const { roomId: dataKey } = data;
    const { userId: targetId } = getUserData();
    muteLocalA({ muteAudio: false });
    updateAndFireMute(dataKey, targetId, false);
}

function groupOnlineMember(data) {
    console.log('media service group online member size:', data);
}

function generateConfMems(callType, members) {
    const     isPtt = CALL_TYPE.isPttAll(callType);
    const  isBodcst = CALL_TYPE.isBroadcast(callType);
    const isTempPtt = CALL_TYPE.isTempPtt(callType);
    const  {userId} = getUserData();
    const  members_ = {};
    Object.values(members || {}).forEach(({callNo, name, mute, renderHint, localRecord}) => 
        members_[callNo] = generateConfMem({
            callNo, 
            name, 
            isHost: userId === callNo,
            localRecord: localRecord || false,
            mute: isPtt || mute,
            renderHint, 
            status: callNo === userId ? MEM_STATUS.JOINED : (isTempPtt || isBodcst) ? MEM_STATUS.JOINED : MEM_STATUS.CALLING,
        })
    );
    return members_;
}

function formatCallData(callData) {
    const { 
        callType, conferenceRecord = CONF_RECORD.NON, fromUserId, fromUserName, isReceive,
        members, previewHint, renderHint, roomId, toUserId, 
        toUserName} = callData;
    const  members_ = generateConfMems(callType, members);
    const audioOnly = CALL_TYPE.isAudioOnly(callType);
    const callData_ = generateCallData({
        audioOnly, conferenceRecord, isReceive, fromUserId, 
        fromUserName, toUserId, toUserName,
        callType, members: members_,
        renderHint, roomId, previewHint,
    });
    return callData_;
}
/**
** 创建通话
*/
export function create (callData) {
    const {callType} = callData;
    const doAction = curry(
        (callData, action) => pipe(formatCallData, action)(callData)
    )(callData);
    pipe( 
        getAction, 
        doAction 
    )(callType);
}
/**
** 更新且上报禁言状态
*/
function updateAndFireMute(dataKey, targetId, mute) {
    const updateMute = () => updateMemberMute(dataKey, targetId, mute);
    pipe(
        updateMute,
        confMemUpdateEvent(dataKey),
        fireMemberUpdate(dataKey)
    )();
}
function updateAndFireSpeaking(dataKey, targetId, speaking) {
    const updateSpeaking = () => updateMemberSpeaking(dataKey, targetId, speaking);
    pipe(
        updateSpeaking,
        confMemUpdateEvent(dataKey),
        fireMemberUpdate(dataKey)
    )();
}
function updateAndFireVideoInfo(dataKey, targetId, { fps, width, height, bitRate }) {
    const updateVideoInfo = () => updateMemberVideoInfo(dataKey, targetId, { fps, width, height, bitRate });
    pipe(
        updateVideoInfo,
        confMemUpdateEvent(dataKey),
        fireMemberUpdate(dataKey)
    )();
}
function updateAndFireStatus(dataKey, callNo, status) {
    pipe(
        () => updateMemberStatus(dataKey, callNo, status),
        confMemUpdateEvent(dataKey),
        fireMemberUpdate(dataKey)
    )();
}
/**
 *! targetId     要禁言的成员的id 9999010003
 *! targetName   要禁言的成员的名字
 *! confNum      会议号
*/
export function muteMember({targetId, targetName, dataKey}) {
    const    setMute = curry(mute)(targetId, targetName);
    //* 禁言信令
    pipe(
        getCallData, 
        setMute
    )(dataKey);
    //* 上报禁言成功
    updateAndFireMute(dataKey, targetId, true);
}

export function unmuteMember({targetId, targetName, dataKey}) {
    const  setUnmute = curry(unmute)(targetId, targetName);
    pipe(
        getCallData, 
        setUnmute
    )(dataKey);
    updateAndFireMute(dataKey, targetId, false);
}

export function inviteMember({targets, dataKey}) {
    const     targetIds = targets.map(target => target.callNo);
    const      callData = getCallData(dataKey);
    const  { callType } = callData;
    invite(targetIds, callData);
    const add = () => targets.forEach(({callNo, name, renderHint}) => addConfMember(dataKey, { callNo, name, callType, renderHint, status: MEM_STATUS.CALLING }));
    pipe(
        add,
        confMemUpdateEvent(dataKey),
        fireMemberUpdate(dataKey)
    )();
}

export function invitePttMember({targets, roomId}) {
    targets.forEach(target => invitePtt(target, roomId))
}

export function inviteTempPttMember({targets, roomId}) {
    targets.forEach(target => inviteTempPtt(target, roomId))
}

export function kickMember({targets, dataKey}) {
    const kickMembers = curry(kick)(targets);
    pipe(
        getCallData, 
        kickMembers
    )(dataKey);
    // const del = targetIds => delConfMember(dataKey, targetIds);
    // pipe(
    //     del,
    //     confMemUpdateEvent(dataKey),
    //     fireMemberUpdate(dataKey)
    // )(targetIds);
}

export function kickPttMember({targets, roomId}) {
    targets.forEach(target => kickPtt(target, roomId));
}

export function kickTempPttMember({targets, roomId}) {
    targets.forEach(target => kickTempPtt(target, roomId));
}

/**
** 加入对讲组
*/
export function joinPtt(callData) {
    const callData_ = formatCallData(callData);
    joinActivePtt(callData_);
}

/**
 ** 确认接听来电时，同时创建推流通道
 ** dataKey: 
 **     roomId
 ** renderHint:
 **     dom     
*/
export function acceptCall(callData) {
    const { 
        callType, 
        members,
        renderHint,
        roomId: dataKey, 
        previewHint,
    } = callData;
    const       isPtt = () => CALL_TYPE.isPttAll(callType);
    const      notPtt = () => !CALL_TYPE.isPttAll(callType);
    const      isConf = () => CALL_TYPE.isConf(callType);
    const     isVConf = CALL_TYPE.isVideoConf(callType);
    const    hasVideo = CALL_TYPE.publishVideo(callType);
    const getConfMems = (isConf() || isPtt()) ?
                        functionalize(queryMembers, callData):
                        identity;
    //* 设置媒体元素
    ifElse(
        hasVideo,
        setVideoElement,
        setAudioElement
    )({dataKey, renderHint, previewHint});
    //! 仅更新视频会议成员的媒体元素
    then(
        isVConf,
        () => Object.values(members).forEach(({ callNo, renderHint }) => updateMemberField(dataKey, callNo, 'renderHint', renderHint)) 
    )();
    //* 选择设备
    const selectDevices = pipe(
        getDefaultDevices,
        ifElse(
            hasVideo,
            selectVideoDevices,
            selectAudioDevices,
        )
    );
    //* 预览画面
    const   preview = functionalize(previewStart, { video: previewHint });
    //* 加入房间
    const callData_ = getCallData(dataKey);
    const { 
        userId: userID, userName 
    } = getUserData();
    const joinHiRTC = functionalize(joinRoom, { callData: callData_, userID, userName })
    const otherAction = pipe(
        selectDevices,
        preview,
        joinHiRTC
    );
    const pttAction = () => createPttPeerConnection(callData_);
    cond(
        [isPtt,  pttAction  ],
        [notPtt, otherAction],
    )();
    //* 通知信令
    pipe(
        getCallData,
        accept,
        getConfMems,
    )(dataKey);
}

export function rejectCall(callData) {
    const     dataKey = callData.roomId;
    const delCallData = deleteCallData(dataKey);
    pipe(
        getCallData,
        reject,
        delCallData
    )(dataKey);
}

export function forceBreakCall(callData) {
    forceBreak(callData);
}

export function leaveCall(callData) {
    const      dataKey = callData.roomId;
    const    callData_ = getCallData(dataKey);
    const        isPtt = () => CALL_TYPE.isPttAll(callData_.callType);
    const   leaveRoom_ = leaveHiRTC(dataKey);                               //* 离开HiRTC房间
    const  delCallData = deleteCallData(dataKey);
    const sendLeaveMsg = functionalize(pipe(getCallData, leave), dataKey);
    const   closePttPC = then(
        isPtt,
        functionalize(closeSendPC, dataKey),
    )
    //* 会话数据存在，则进行后续操作
    then(
        callData_,
        pipe(
            sendLeaveMsg,
            leaveRoom_,
            closePttPC,
            delCallData
        )
    )();
}
/**
 ** 主动创建的会议/对讲/喊话结束时，要destroy
 */
export function destroyCall(callData) {
    const     dataKey = callData.roomId;
    const       isPtt = CALL_TYPE.isPttAll(callData.callType);
    const    isBodcst = CALL_TYPE.isBroadcast(callData.callType);
    const delCallData = deleteCallData(dataKey);
    const     freePtt = dealPttDestroy(dataKey);
    const sendDestroy = functionalize(pipe(getCallData, destroy), dataKey);
    const  leaveRoom_ = leaveHiRTC(dataKey);                                    //* 离开HiRTC房间
    const  closePttPC = then(
        isPtt || isBodcst,
        functionalize(closeSendPC, dataKey),
    )
    pipe(
        freePtt,
        sendDestroy,
        leaveRoom_,
        closePttPC,
        delCallData
    )(dataKey);
}

export function isCallExist() {
    const {
        voice, voiceConf, ptt, tempPtt, broadcast, 
        video, videoConf, forceInsert, forceMonitor, 
        videoMonitor
    } = getCallStatistics();
    return voice || voiceConf || ptt || tempPtt || broadcast ||
    video || videoConf || forceInsert || forceMonitor || videoMonitor;
}

/**
 ** 语音通话开始录音 
 */
export function startAudioRecord(dataKey, fileName) {
    const   createRecord = curry(audioMediaRecord)(fileName);
    const      getRecvPC = curry(getRecvPeerConnectionById)(dataKey);
    const updateRecorder = curry((dataKey, mediaRecorder) => updateCallData(dataKey, { mediaRecorder }))(dataKey);
    pipe(
        getRecvPC,
        createRecord,
        startRecord,
        updateRecorder
    )(dataKey);
}

export function stopAudioRecord(dataKey) {
    const clearRecord = functionalize(clearMediaRecorder, dataKey);
    pipe(
        getMediaRecorder,
        stopRecord,
        clearRecord
    )(dataKey);
}
/**
** 暂时无用 
*/
export function videoStatsInfo(dataKey) {
    const getRecvPC = curry(getRecvPeerConnectionById)(dataKey);
    return pipe(
        getRecvPC,
        getVideoStatsInfo
    )(dataKey);
}
/**
 ** 对讲抢话权 
 */
export function grabSpeak(dataKey) {
    pipe(
        getCallData,
        grab
    )(dataKey);
}
/**
 ** 对讲释放话权
 */
export function freeSpeak(dataKey) {
    pipe(
        getCallData,
        free
    )(dataKey);    
}

function getSubscribeId(dataKey, callNo) {
    const { callType, subscribeId } = getCallData(dataKey);
    const isGroup = CALL_TYPE.isGroup(callType);
    return isGroup ? getConfMemSubsId(dataKey, callNo) : subscribeId;
}

/**
 ** 开始录制
 */
export function startRecordStream(dataKey, callNo, type = HiRTC_RECORD_TYPE.ALL) {
    const { userId } = getUserData();
    const getSubsId = () => getSubscribeId(dataKey, callNo);
    ifElse(
        userId === callNo,
        startRecordLocal,
        pipe(
            getSubsId,
            subscribeId => startRecordRemote(subscribeId, type)
        )
    )();
}
/**
 ** 开始监控录制
 */
export function startRecordMonitorStream(callNo) {
    const dataKey = getVideoMonitorRoomId();
    const { userId } = getUserData();
    const getSubsId = () => getSubscribeId(dataKey, callNo);
    ifElse(
        userId === callNo,
        startMonitorRecordLocal,
        pipe(
            getSubsId,
            startMonitorRecordRemote
        )
    )();
}
/**
 ** 结束录制
 */
export function stopRecordStream(dataKey, callNo, fileName = '') {
    const { userId } = getUserData();
    const subsId = getSubscribeId(dataKey, callNo);
    fileName = fileName || `no_file_name_${new Date().getTime()}.webm`;
    const downloadFile = ifElse(
        userId === callNo,
        () => stopRecordLocal({ autoDownload: false }),
        () => stopRecordRemote({ subscribeId: subsId, autoDownload: false })
    )();
    return then(
        downloadFile => !!downloadFile,
        downloadFile => downloadFile
        .then(file => downloadFileByA(fileName, file))
        .catch(err => console.error('media service download record file error: ', err))
    )(downloadFile);
}
/**
 ** 结束监控录制 
 */
export function stopRecordMonitorStream(callNo, fileName = '') {
    const dataKey = getVideoMonitorRoomId();
    fileName = fileName || `no_file_name_${new Date().getTime()}.webm`;
    const { userId } = getUserData();
    const subsId = getSubscribeId(dataKey, callNo);
    const downloadFile = ifElse(
        userId === callNo,
        () => stopMonitorRecordLocal({ autoDownload: false }),
        () => stopMonitorRecordRemote({ subscribeId: subsId, autoDownload: false })
    )();
    return then(
        downloadFile => !!downloadFile,
        downloadFile => downloadFile
        .then(file => downloadFileByA(fileName, file))
        .catch(err => console.error('media service download record file error: ', err))
    )(downloadFile);
}
/**
 ** 视频通话截图
 */
export function captureImage(dataKey, callNo, fileName = '') {
    const subsId = getSubscribeId(dataKey, callNo);
    fileName = fileName || `no_file_name_${new Date().getTime()}.png`;
    return captureRemoteImage(subsId, false)
    .then(file => downloadFileByA(fileName, file))
    .catch(err => console.error('media service download image file error: ', err));
}

export function captureMonitorImage(callNo, fileName = '') {
    const dataKey = getVideoMonitorRoomId();
    fileName = fileName || `no_file_name_${new Date().getTime()}.png`;
    return captureImage(dataKey, callNo, false)
    .then(file => downloadFileByA(fileName, file))
    .catch(err => console.error('media service download image file error: ', err));
}

export function muteRemoteAudio (dataKey, callNo, muteAudio = true) {
    const subscribeId = getSubscribeId(dataKey, callNo);
    muteRemoteA({subscribeId, muteAudio});
}

export function muteMonitorRemoteAudio(dataKey, callNo, muteAudio = true) {
    const subscribeId = getSubscribeId(dataKey, callNo);
    muteMonitorRemoteA({subscribeId, muteAudio});
    //* 上报禁言成功
    updateAndFireMute(dataKey, callNo, muteAudio);
}

/**
 ** 远程控制--终端缩小
 */
export function remoteCtrlZoomIn(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DaRemoteZoom, imei);
}
/**
 ** 远程控制--终端放大
 */
export function remoteCtrlZoomOut(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DaRemoteZoomScale, imei);
}
/**
 ** 远程控制--数据清除
 */
export function remoteCtrlDataClear(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DpClear, imei);
}
/**
 ** 远程控制--强制离线
 */
export function remoteCtrlOffline(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DaQuit, imei);
}
/**
 ** 远程控制--开启终端本地录像
 */
export function remoteCtrlTmlRecordStart(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DaVideoS, imei);
}
/**
 ** 远程控制--结束终端本地录像
 */
export function remoteCtrlTmlRecordStop(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DaVideoE, imei);
}
/**
 ** 远程控制--终端拍照
 */
export function remoteCtrlTmlPhoto(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DaPhotoS, imei);
}
/**
 ** 远程控制--参数变更
 */
export function remoteCtrlTmlParam(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.GrConfig, imei);
}
/**
 ** 远程控制--人脸库变更通知
 */
export function remoteCtrlFaceChange(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.GrFace, imei);
}
/**
 ** 远程控制--车牌库变更通知
 */
export function remoteCtrlCarNum(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.GrVehicle, imei);
}
/**
 ** 远程控制--终端资源查看
 */
export function remoteCtrlTmlRes(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DaFileQuery, imei);
}
/**
 ** 远程控制--终端摄像头切换
 */
export function remoteCtrlTmlSwitchCamera(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DaTurnCamera, imei);
}
/**
 ** 远程控制--关机
 */
 export function remoteCtrlTmlShutdown(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DaShutdown, imei);
}
/**
 ** 远程控制--重启
 */
 export function remoteCtrlTmlReboot(callNo, imei) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DaReboot, imei);
}

/**
 ** 远程控制--重启
 */
 export function remoteCtrlFileUpload(callNo, url, mark) {
    return remoteCtrlSignalling(callNo, CHILD_MSG_TYPE.DaFileUpload, '', {url, mark});
}

/**
 ** 远程控制--自定义控制消息
 */
export function customCtrlMessage(callNo, msgType, imei, extra = {}) {
    return remoteCtrlSignalling(callNo, msgType, imei, extra);
}
/**
** 向房间内发送自定义消息 
*/
export function sendCustomMessage2Room(roomId, content) {
    const { userId } = getUserData();
    const sendMessage = ({members}) => Object.values(members).forEach(({callNo}) => {
        userId !== callNo && sendCustomMessage(content, callNo)
    });
    pipe(
        getCallData,
        sendMessage
    )(roomId);
}