/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
class SocketJS {
    static OPEN     = 'open';
    static ERROR    = 'error';
    static MESSAGE  = 'msg';
    static CLOSED   = 'closed';
    constructor({url, protocols = '', fireEvent = () => {}} = {}) {
        this.websocket          = null;         //* websocket实例
        this.reconnectTimer     = null;         //* 重连计时器
        this.isManualClose      = false;        //* 是否手动关闭连接
        this.url                = url;          //* 服务地址
        this.protocols          = protocols;    //* 子协议
        this.fireEventCb        = fireEvent;    //* 事件回调
    }    
    connect() {
        if (!WebSocket) {
            console.warn('浏览器不支持WebSocket');
            return;
        }
        this.websocket = new WebSocket(this.url, this.protocols);
        return this;
    }    
    initSocketEvent() {
        this.isManualClose = false;
        this.websocket.onclose = e => {
            console.log('media service websocket连接关闭: ', this.url, e);
            // 如果手动关闭则不进行重连
            this.reconnect();
            this.fireEvent(SocketJS.CLOSED, JSON.stringify(e.target));
        }

        this.websocket.onerror = e => {
            console.error('media service websocket发生异常: ', this.url, e);
            this.reconnect();
            this.fireEvent(SocketJS.ERROR, JSON.stringify(e.target));
        }

        this.websocket.onopen = (e) => {
            console.log('media service websocket已连接: ', this.url, e);
            this.fireEvent(SocketJS.OPEN, JSON.stringify(e.target));
        }

        this.websocket.onmessage = e => {
            console.log('media service websocket接收消息: ', e.data);
            this.fireEvent(SocketJS.MESSAGE, e.data);
        }
        return this;
    }    
    fireEvent (type, data) {
        isFunction(this.fireEventCb) && this.fireEventCb(type, data);
        return this;
    }
    fireMsg (type, data) {
        return {type, data};
    }
    getSocketState () {
        return this.websocket ? this.websocket.readyState : undefined;
    }
    isConnected () {
        return this.websocket ? this.websocket.readyState === WebSocket.OPEN : false;
    }    
    reconnect() {
        if (!this.isManualClose) {
            if (!this.isConnected()) {
                console.log('media service websocket 重新连接~ ');
                this.reconnectTimer && clearTimeout(this.reconnectTimer);
                this.reconnectTimer = setTimeout(() => {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                    this.connect().initSocketEvent();
                }, 1000);
            }        
        } else {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        return this;
    }    
    send(msg) {
        const result = {
            code: '000',
            error: '',
            sendMsg: msg
        }
        if (this.isConnected()) {
            console.log(`media service 发送消息 , 时间: ${new Date()}, 内容: ${JSON.stringify(msg)}`);
            this.websocket.send(JSON.stringify(msg));    
        } else {
            console.error('media service 当前websocket未连接, 无法发送消息: ', msg);
            result.code = '100';
            result.error = 'websocket连接已断开'
        }
        return result;
    }    
    close() {
        this.isManualClose = true;
        if (this.websocket) {
            this.websocket.close();
        }
        return this;
    }
}

function isFunction(obj) {
    return Object.prototype.toString.call(obj) === '[object Function]';
}

export default SocketJS;