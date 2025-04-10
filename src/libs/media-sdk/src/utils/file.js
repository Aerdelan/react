import { formatNow } from "./common";

/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
export function downloadUseA(fileName, url) {
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.innerHTML = 'download file by a label';
    const name = fileName;
    downloadLink.setAttribute("download", name);
    downloadLink.setAttribute("name", name);
    downloadLink.click();
}

export function downloadFileByA(fileName, file) {
    const    a = document.createElement('a');
    const blob = new Blob([file]);
    const  url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = `${fileName}`;
    a.click();
    window.URL.revokeObjectURL(url);
}

export function getFileName(fromUserName, toUserName) {
    return `${fromUserName}_${toUserName}_${formatNow('yyyyMMddHHmmss')}.webm`;
}