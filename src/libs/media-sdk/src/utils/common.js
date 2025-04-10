import { ifElse, tap } from "./functional-utils";

/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
const _toString = Object.prototype.toString;
export function getTimestamp () {
    return new Date().getTime();
}
export function toString(obj) {
    return _toString.call(obj);
}
export function isArray(obj) {
    return toString(obj) === '[object Array]';
}
export function isObject(obj) {
    return toString(obj) === '[object Object]';
}
export function isFunction(obj) {
    return toString(obj) === '[object Function]';
}
export function isBoolean(obj) {
    return toString(obj) === '[object Boolean]';
}
export function isFormData(obj) {
    return toString(obj) === '[object FormData]';
}
export function setTimeoutAutoClear(cb, timeout, params = undefined) {
    let timer = setTimeout(() => {
        cb && cb(params);
        clearTimeout(timer);
    }, timeout);
    return timer;
}

function copyObj () {
    let name, 
        options,                        // 待拷贝的源对象
        src,                            // 目标属性
        copy,                           // 待拷贝的属性
        copyIsArray,                    // 是否为数组
        clone,
        i = 1,                          // 拷贝对象的索引
        target = arguments[0] || {},    // 使用||运算符，排除隐式强制类型转换为false的数据类型
        deep = false,                   // 第一个参数代表是否为深拷贝
        len = arguments.length;         // 需要拷贝的对象个数
    if (isBoolean(target)) {
        deep = target;
        target = arguments[1] || {};
        i++;
    }
    if (!isObject(target) && !isFunction(target) && !isArray(target)) {
        target = {};
    }
    if (i === len) {
        return target;
    }
    for (; i < len; i++) {
        if ((options = arguments[i]) != null) {
            for (name in options) {
                src = target[name];
                copy = options[name];
                copyIsArray = isArray(copy);
                if (deep && copy && (isObject(copy) || copyIsArray)) {
                    if (copyIsArray) {
                        copyIsArray = false;
                        clone = src && isArray(src) ? src : [];
                    } else {
                        clone = src && isObject(src) ? src : {};
                    }
                    target[name] = copyObj(deep, clone, copy);
                } else if (copy !== undefined && copy !== null) {
                    target[name] = copy;
                }
            }
        }
    }
    return target;
}

export function deepCopy(target, source) {
    const ret = {};
    return copyObj(true, ret, target, source);
}

export function loadJSByPath(path) {
    const script = document.createElement('script');
    script.src   = path;
    const html   = document.getElementsByTagName('html')[0];
    html.appendChild(script);
}

export function loadJSByText(content) {
    const script = document.createElement('script');
    script.text  = content;
    const html   = document.getElementsByTagName('html')[0];
    html.appendChild(script);
}

export async function loadJSRequest(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
        });
        const content  = await response.text();
        loadJSByText(content);
    } catch (err) {
        console.error(err);
    }
}

export function getUserIdFromPublishId(publishId) {
    return ifElse(
        publishId,
        publishId => publishId.split('-')[0],
        tap(console.error)
    )(publishId);
}

/**
 * 时间格式化：使用方法formatDate(parseInt(data), 'yyyy-MM-dd HH:mm:ss');
 * @param {Object} time
 * @param {Object} format
 */
export function formatNow(format) {
	let t = new Date();
	let tf = function(i) {
		return (i < 10 ? '0' : '') + i;
	}
	return format.replace(/yyyy|MM|dd|HH|mm|ss/g, function(a) {
		switch(a) {
			case 'yyyy':
				return tf(t.getFullYear());
			case 'MM':
				return tf(t.getMonth() +1);
			case 'dd':
				return tf(t.getDate());
			case 'HH':
				return tf(t.getHours());
            case 'mm':
                return tf(t.getMinutes());
			case 'ss':
				return tf(t.getSeconds());
            case 'ms':
                return tf(t.getMilliseconds());
		}
	});
}

export const TIMER_S = {
    ONE:    1  * 1000,
    TWO:    2  * 1000,
    THREE:  3  * 1000,
    FOUR:   4  * 1000,
    FIVE:   5  * 1000,
    TEN:    10 * 1000,
}