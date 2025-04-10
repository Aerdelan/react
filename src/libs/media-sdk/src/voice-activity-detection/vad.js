/*
* This file is part of the Media SDK project.
* Copyright (c) 2023 Hisense.Co.Ltd. All rights reserved.
* Unauthorized copying of this file, via any medium is strictly prohibited.
* @author chengdongsheng <chengdongsheng@hisense.com>
*/
import { curry } from "../utils/functional-utils.js";
import { audioNodeConnect, createAudioContext, createScriptProcessor, getStreamSourceFromContext } from "./audio-context.js";
import { RB_SIZE } from "./common.js";
import { RingBuffer } from "./ring-buffer.js";

export function createVAD(mediaStream) {
    const TIME_DOMAIN_DATA = new RingBuffer(RB_SIZE);
    const VAD_RESULT       = []; // result of VAD saved in an array
    const MEL_RAW          = [];
    let   nextStartPos     = 0;
    let   dataPos          = 0;
    function framing(timeDomainData, melRaw, nextStartPos, dataPos) {
        let headPos = timeDomainData.getHeadPos();
        let availableData = headPos - nextStartPos;
        if (availableData < 0) {
            availableData = headPos + timeDomainData.getLength() - nextStartPos;
        }
    
        if (availableData < FRAME_SIZE) {
            return;
        }
    
        let nFrames = utils.getNumberOfFrames(availableData, FRAME_SIZE, FRAME_STRIDE);
        let startPos = nextStartPos;
        let endPos = (nextStartPos + FRAME_SIZE) % RB_SIZE;
    
        for (let idx = 0; idx < nFrames; idx++) {
            let frame_buffer = timeDomainData.getSlice(startPos, endPos);
        
            // Windowing
            fenster.hamming(frame_buffer);
        
            // Fourier Transform
            const mag = fft.getPowerspectrum(frame_buffer);
            
        
            // Apply mel filter
            //* 根据人耳听觉机理的研究发现，人耳对不同频率的声波有不同的听觉敏感度。从200Hz到5000Hz的语音信号对语音的清晰度影响最大
            //* 两个响度不等的声音作用于人耳时，则响度较高的频率成分的存在会影响到对响度较低的频率成分的感受，使其变得不易察觉，这种现象称为掩蔽效应
            let mel_array = filter.getMelCoefficients(mag);
        
            MEL_RAW[dataPos] = mel_array;
        
            // Bookeeping
            dataPos = (dataPos + 1) % RB_SIZE_FRAMING;
            startPos = (startPos + FRAME_STRIDE) % RB_SIZE;
            endPos = (endPos + FRAME_STRIDE) % RB_SIZE;
        }
    
        nextStartPos = startPos;
    }
    return () => {
        const audioContext = createAudioContext();
        const { streamSource, processor } = initContext(mediaStream, audioContext);
        audioNodeConnect(streamSource, processor);
        audioNodeConnect(processor, audioContext.destination);
        onAudioProcess(processor, (e) => {
            const { inputBuffer } = e;
            const channelData = inputBuffer.getChannelData(0);
            TIME_DOMAIN_DATA.concat(channelData);
        });
    }
}

function initContext(mediaStream, audioContext) {
    const streamSource = getStreamSourceFromContext(mediaStream, audioContext);
    const processor = createScriptProcessor(audioContext);
    return { streamSource, processor };    
}

function onAudioProcess(processor, callback) {
    processor.onaudioprocess = function (e) {
        callback && callback(e);
    };
}