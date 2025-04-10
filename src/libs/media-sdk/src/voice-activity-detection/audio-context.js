/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
import { BUFFER_SIZE, SAMPLE_RATE } from "./common.js";
export function createAudioContext(options = { samplerate: SAMPLE_RATE }) {
    const audioContext = new AudioContext(options);
    return audioContext;
}

export function getStreamSourceFromContext(mediaStream, audioContext) {
    const source = audioContext.createMediaStreamSource(mediaStream);
    return source;
}

export function createScriptProcessor(audioContext, bufferSize = BUFFER_SIZE) {
    const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    return processor;
}

export function audioNodeConnect(streamSource, processor) {
    streamSource.connect(processor);
}