import { Alert, Button, Input, message } from 'antd';
import React, { useState } from 'react';
// 调度 00 10
// 终端 04 06
import {
  CALL_TYPE,
  create,
  FIRE_EVENT,
  initMediaSdk,
  MEM_STATUS,
} from '../libs/media-sdk/index';
import './index.less';
const RoomePage: React.FC = () => {
  const [fromUserId, setFromUserId] = useState<string>('');
  const [toUserId, setToUserId] = useState<string>('');
  const [isInited, setIsInited] = useState<boolean>(false);
  // 消息提示框
  const [messageApi, contextHolder] = message.useMessage();
  const handleChangeFromUserId = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromUserId(e.target.value);
  };
  const handleChangeToUserId = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToUserId(e.target.value);
  };

  // 注册服务开始
  const init = () => {
    if (fromUserId) {
      messageApi.warning('请输入本端用户id');
      return;
    }

    // 提取常量
    const ip = '219.147.31.58';
    const port = 9321;
    const serviceID = '940b785dd85542149ad268f5';
    const serviceKey = '2c17c6393771ee3048ae34d6b380c5ec';
    const basicRoomServiceToken = `https://${ip}:7080/v1/auth/token`;

    // 初始化SDK
    initMediaSdk({
      ip,
      port,
      userId: fromUserId, // 使用狀態中的值
      userName: '王小四',
      fireEvent: sdkFireEvent, // 假設 sdkFireEvent 是一個函數
      videoMonitorRoomId: roomID, // 假設 roomID 是一個變數
      serviceID,
      serviceKey,
      Services: {
        BasicRoomServiceToken: basicRoomServiceToken,
      },
      sslEnable: false,
    });

    setIsInited(true); // 假設 isInited 是全局變數或狀態
  };

  const sdkFireEvent = (callData: any, event: string) => {
    switch (event) {
      case FIRE_EVENT.STATE_CHANGED:
        callStateChanged(callData);
        break;

      case FIRE_EVENT.ERROR_OCCURED:
        console.error('An error occurred:', callData);
        break;

      case FIRE_EVENT.CALL_ARRIVE:
        callArrive(callData);
        break;

      case FIRE_EVENT.TML_STATUS:
        console.log('Terminal status changed:', callData);
        tmlStatusChanged(callData);
        break;

      case FIRE_EVENT.MEMBER_UPDATE:
        callMemUpdate(callData);
        break;

      case FIRE_EVENT.CALL_EVENT:
        console.log('Call event received:', callData);
        break;

      case FIRE_EVENT.UPDATE_ROOM_ID:
        updateRoomId(callData);
        break;

      case FIRE_EVENT.CONNECTED:
        console.log('Connected to the server.');
        break;

      case FIRE_EVENT.DISCONNECTED:
        console.warn('Disconnected from the server.');
        break;

      case FIRE_EVENT.PTT_ACTIVE:
        console.log('PTT active event received.');
        break;

      case FIRE_EVENT.VIDEO_INFO: {
        const { fromUserId, isReceive, statsInfo, toUserId } = callData;
        const { fps, width, height, bitRate } = statsInfo;
        const callNo = isReceive ? fromUserId : toUserId;
        console.log(
          `${callNo} 视频信息: width=${width}, height=${height}, bitRate=${bitRate}, fps=${fps}`,
        );
        break;
      }

      default:
        console.warn('Unhandled event:', event, callData);
        break;
    }
  };
  const callStateChanged = (callData: any) => {
    const { callState, callType, isReceive, fromUserId, toUserId } = callData;

    // 判斷是否為視頻通話
    const isVideo = CALL_TYPE.isVideo(callType);
    const callNo = isVideo ? (isReceive ? fromUserId : toUserId) : toUserId;

    // 更新狀態或執行操作
    switch (callType) {
      case CALL_TYPE.VIDEO:
      case CALL_TYPE.VIDEO_CONFERENCE:
      case CALL_TYPE.VOICE:
      case CALL_TYPE.FORCE_INSERT:
      case CALL_TYPE.FORCE_MONITOR:
      case CALL_TYPE.PTT:
      case CALL_TYPE.TEMP_PTT:
      case CALL_TYPE.BROADCAST:
      case CALL_TYPE.VOICE_CONFERENCE:
        console.log(`Call state updated for ${callNo}:`, callState);
        // 假設有一個狀態變數來存儲 callState
        // setCallData((prev) => ({ ...prev, callState }));
        break;

      case CALL_TYPE.VIDEO_MONITOR:
        console.log('Video monitor event received.');
        break;

      default:
        console.warn('Unhandled call type:', callType);
        break;
    }
  };
  // 注册服务结束

  // 创建通话操作
  const createVideoCall = () => {
    console.log('创建通话', fromUserId, toUserId);

    // 檢查對端用戶 ID 是否存在
    if (!toUserId) {
      messageApi.warning('请输入对端用户Id');
      return;
    }

    // 模擬本地預覽和遠端流數據
    const remoteStreamData = {
      callNo: toUserId,
      id: toUserId,
      name: '王小三',
      mute: false, // true: 正在讲话或者抢得话权
      online: true,
      renderHint: null, // 视频会议渲染元素
      status: MEM_STATUS.CALLING,
      speaking: false, // 是否正在讲话
      isHost: false, // 是否为主持人
      fps: 0,
      width: 0,
      height: 0,
      bitRate: 0,
    };

    // 模擬 DOM 引用
    const previewHint = document.getElementById('localVideoMedia'); // 假設有對應的 DOM 元素
    const renderHint = document.getElementById(`stream-${toUserId}`); // 假設有對應的 DOM 元素

    // 構建通話數據
    const callData = {
      previewHint,
      renderHint,
      fromUserId,
      fromUserName: '调度员',
      toUserId,
      toUserName: 'app4',
    };

    console.log('callData', callData);

    // 調用創建通話的函數
    create(callData);
  };
  // 创建语音会议操作
  const createVoiceMeeting = () => {
    console.log('创建语音会议', fromUserId, toUserId);
  };
  // 创建视频会议操作
  const createVideoMeeting = () => {
    console.log('创建视频会议', fromUserId, toUserId);
  };
  // 创建对讲操作
  const createTempPtt = () => {
    console.log('创建对讲', fromUserId, toUserId);
  };
  // 结束通话操作
  const stopCall = () => {
    console.log('结束通话', fromUserId, toUserId);
  };
  return (
    <div>
      <div>
        <Alert
          message="音视频通话"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      </div>
      <div className="room">
        <div className="title">操作</div>
        <div className="content">
          <h3>本端用户ID</h3>
          <Input
            className="hi-input"
            value={fromUserId}
            onChange={handleChangeFromUserId}
          ></Input>
          <h3>对端用户ID</h3>
          <Input
            className="hi-input"
            value={toUserId}
            onChange={handleChangeToUserId}
          ></Input>
        </div>
        <div>
          <Button
            type="primary"
            className="hi-button"
            onClick={init}
            style={{ marginRight: 10 }}
          >
            注册服务
          </Button>
          <Button
            type="primary"
            className="hi-button"
            style={{ marginRight: 10 }}
          >
            创建通话
          </Button>
          <Button
            type="primary"
            className="hi-button"
            style={{ marginRight: 10 }}
          >
            创建语音会议
          </Button>
          <Button
            type="primary"
            className="hi-button"
            style={{ marginRight: 10 }}
          >
            创建视频会议
          </Button>
          <Button
            type="primary"
            className="hi-button"
            style={{ marginRight: 10 }}
          >
            创建对讲
          </Button>
          <Button type="primary" className="hi-button">
            结束通话
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomePage;
