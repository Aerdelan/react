/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
import axios from 'axios';
import qs from 'qs';
import { getIP, getPort } from '../data/global.data';
import { isFormData } from '../utils/common';
const instance = (function init() {
    const   ip = getIP();
    const port = getPort();
    axios.defaults.baseURL = `https://${ip}:${port}/`;
    const instance = axios.create({ timeout: 1000 * 60 });
    instance.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
    instance.defaults.withCredentials = true;
    instance.defaults.transformRequest = [function (data) {
        if (isFormData(data)) {
            return data;
        }
        let ret = qs.stringify(data);
        return ret;
    }]

    instance.interceptors.request.use(
        config => {
            // 加一个时间戳，防止走缓存，cds
            if (config.method === 'post' && !isFormData(config.data)) {
                config.data = {
                    ...config.data,
                    _timestamp: Date.parse(new Date()) / 1000
                }
            } else if (config.method === 'get') {
                config.params = {
                    _timestamp: Date.parse(new Date()) / 1000,
                    ...config.params
                }
            }
            return config;
        },
        error => Promise.error(error)
    )

    instance.interceptors.response.use(
        // 请求成功
        res => {
            if (res.status >= 200 && res.status < 299) {
                return Promise.resolve(res.data);
            } else {
                return Promise.reject(res.data)
            }
        },
        // 请求失败
        error => {
            const { response } = error;
            if (error.code === 'ECONNABORTED' && error.message.indexOf('timeout') !== -1) {
                return Promise.reject({ timeout: true });
            } else if (response) {
                // 请求已发出，但是不在2xx的范围
                return Promise.reject(response);
            } else {
                return Promise.reject(error);
            }
        }
    );
    return instance;
})()
export const httpApi = {
    createPttGroup (groupNum, groupName, idleTimeout, speakTimeout, audioRecord) {
        const  param = { groupNum, groupName, idleTimeout, speakTimeout, audioRecord };
        const reqApi = 'ptt/app/createPttGroup';
        return instance.post(reqApi, param);
    },
    delPttGroup (groupNum) {
        const  param = { groupNum };
        const reqApi = 'ptt/app/delPttGroup';
        return instance.post(reqApi, param);
    },
    getMemberListByGroupNum (groupNum) {
        const  param = {groupNum};
        const reqApi = 'ptt/app/getMemberListByGroupNum';
        return instance.post(reqApi, param);
    },
    freshPTTGroupListRTC (userNum) {
        const  param = {userNum};
        const reqApi = 'ptt/app/getPttGroupListByUserNum';
        return instance.post(reqApi, param);
    },
    getAllPttGroup () {
        const reqApi = 'ptt/app/getAllPttGroup';
        return instance.post(reqApi);
    },
    addMemberToPttGroup (groupNum, memberList) {
        memberList = Array.isArray(memberList) ? memberList.join(',') : memberList; 
        const param = {groupNum, memberList};
        const reqApi = 'ptt/app/addMemberToPttGroup';
        return instance.post(reqApi, param);
    },
    delMemberToPttGroup (groupNum, memberList) {
        memberList = Array.isArray(memberList) ? memberList.join(',') : memberList;
        const param = {groupNum, memberList};
        const reqApi = 'ptt/app/delMemberToPttGroup';
        return instance.post(reqApi, param);
    },
    updateMemberToPttGroup (groupNum, memberList) {
        memberList = Array.isArray(memberList) ? memberList.join(',') : memberList;
        const param = {groupNum, memberList};
        const reqApi = 'ptt/app/updateMemberToPttGroup';
        return instance.post(reqApi, param);
    },
    getPttGroupListByUserNum (userNum) {
        const param = {userNum};
        const reqApi = 'ptt/app/getPttGroupListByUserNum';
        return instance.post(reqApi, param);
    },
    getPttGroupListByDispatcher (userNum) {
        const param = {userNum};
        const reqApi = 'ptt/app/getPttGroupListByDispatcher';
        return instance.post(reqApi, param);
    },
    updatePttGrpInfo (groupNum, groupName, idleTimeout, speakTimeout, audioRecord) {
        const param = {groupNum, groupName, idleTimeout, speakTimeout, audioRecord};
        const reqApi = 'ptt/app/updatePttGrpInfo';
        return instance.post(reqApi, param);
    },
    getPttGrpInfoByGrpNum (groupNum) {
        const param = {groupNum};
        const reqApi = 'ptt/app/getPttGrpInfoByGrpNum';
        return instance.post(reqApi, param);
    }
};