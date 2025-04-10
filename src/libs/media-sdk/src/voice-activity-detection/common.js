export const VAD_THRESHOLD = 0.7;
export const SAMPLE_RATE   = 48000;
export const BUFFER_SIZE   = 1024;
export const FRAME_SIZE    = SAMPLE_RATE * 0.025;                                   // Frame time == 25 ms
export const FRAME_STRIDE  = SAMPLE_RATE * 0.01;                                    // Frame stride == 10 ms (=> 15 ms overlap)

export const BUFFER_TIME   = 1;                                                     // in seconds
export const SAMPEL_NUM    = SAMPLE_RATE * BUFFER_TIME;
export const RECORD_SIZE   = Math.floor(SAMPEL_NUM / BUFFER_SIZE) * BUFFER_SIZE;    // ~buffertime in number of samples, ensure integer fraction size of concat
export const RB_SIZE       = 2 * RECORD_SIZE;                                       // Ringbuffer Time Domain (1D), arbitrary choice, shall be gt RECORD_SIZE and integer fraction of BUFFER_SIZE
export const RB_FRAMES     = utils.getNumberOfFrames(RB_SIZE, FRAME_SIZE, FRAME_STRIDE); // how many frames with overlap fit into time domain ringbuffer




function map(value, x1, y1, x2, y2) {
    return ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;
}

function constrain(value, min, max) {
    value = value < min ? min : value;
    value = value > max ? max : value;
    return value;
}

function assert(condition, message) {
    if (!condition) {
      message = message || 'Assertion failed';
      if (typeof Error !== 'undefined') {
        throw new Error(message);
      }
      throw message; // Fallback
    }
}

function rangeMap(val, min_exp, max_exp, map_x1, map_x2) {
    val = constrain(val, min_exp, max_exp);
    val = map(val, min_exp, max_exp, map_x1, map_x2);

    return val;
}

function logRangeMap(val, min_exp, max_exp, map_x1, map_x2) {
    val = Math.log10(val);
    val = rangeMap(val, min_exp, max_exp, map_x1, map_x2);

    return val;
}

export function rangeMapBuffer(buffer, min_exp, max_exp, map_x1, map_x2) {
    let ret = [];

    for (let idx = 0; idx < buffer.length; idx++) {
      ret.push(rangeMap(buffer[idx], min_exp, max_exp, map_x1, map_x2));
    }

    return ret;
}

export function logRangeMapBuffer(buffer, min_exp, max_exp, map_x1, map_x2) {
    let ret = [];

    for (let idx = 0; idx < buffer.length; idx++) {
      ret.push(logRangeMap(buffer[idx], min_exp, max_exp, map_x1, map_x2));
    }
    return ret;
}

export function indexOfMax(arr) {
    if (arr.length === 0) {
      return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
      if (arr[i] > max) {
        maxIndex = i;
        max = arr[i];
      }
    }

    return maxIndex;
}

export function decibelsToLinear(decibels) {
    return Math.pow(10, 0.05 * decibels);
}

function linearToDecibels(linear) {
    // It's not possible to calculate decibels for a zero linear value since it would be -Inf.
    // -1000.0 dB represents a very tiny linear value in case we ever reach this case.
    if (!linear) return -1000;
    return 20 * Math.log10(linear);
}

export function getNumberOfFrames(total_size, frame_size, frame_stride) {
    return 1 + Math.floor((total_size - frame_size) / frame_stride);
}

export function getSizeOfBuffer(n_frames, frame_size, frame_stride) {
    assert(n_frames > 1, 'number of frames too low');
    assert(frame_size > frame_stride, 'stride larger than frame size ...?');
    return frame_size + (n_frames - 1) * frame_stride;
}

  // [-1, 1]
export function meanNormalize(buffer2D) {
    let nRow = buffer2D.length;
    let nCol = buffer2D[0].length;

    let mean = 0;
    let min = 1e6;
    let max = -1e6;
    for (let row = 0; row < nRow; row++) {
      for (let col = 0; col < nCol; col++) {
        let val = buffer2D[row][col];
        mean += val;
        min = val < min ? val : min;
        max = val > max ? val : max;
      }
    }
    mean /= nRow * nCol;

    const width = max - min;
    for (let row = 0; row < nRow; row++) {
      for (let col = 0; col < nCol; col++) {
        buffer2D[row][col] = (buffer2D[row][col] - mean) / width;
      }
    }
}

  // [0, 1]
export function minMaxNormalize(buffer2D) {
    let nRow = buffer2D.length;
    let nCol = buffer2D[0].length;

    let mean = 0;
    let min = 1e6;
    let max = -1e6;
    for (let row = 0; row < nRow; row++) {
      for (let col = 0; col < nCol; col++) {
        let val = buffer2D[row][col];
        mean += val;
        min = val < min ? val : min;
        max = val > max ? val : max;
      }
    }
    mean /= nRow * nCol;

    // console.log(mean, min, max);

    let width = max - min;
    if (width == 0) {
      width = 1;
    }
    for (let row = 0; row < nRow; row++) {
      for (let col = 0; col < nCol; col++) {
        buffer2D[row][col] = (buffer2D[row][col] - min) / width;
      }
    }
}

export function standardize(buffer2D) {
    let nRow = buffer2D.length;
    let nCol = buffer2D[0].length;

    let mean = 0;
    let sigma = 0;
    for (let row = 0; row < nRow; row++) {
      for (let col = 0; col < nCol; col++) {
        mean += buffer2D[row][col];
      }
    }
    mean /= nRow * nCol;

    for (let row = 0; row < nRow; row++) {
      for (let col = 0; col < nCol; col++) {
        sigma += Math.pow(buffer2D[row][col] - mean, 2);
      }
    }
    sigma /= nRow * nCol - 1;
    sigma = Math.sqrt(sigma);

    for (let row = 0; row < nRow; row++) {
      for (let col = 0; col < nCol; col++) {
        buffer2D[row][col] = (buffer2D[row][col] - mean) / sigma;
      }
    }
}

function powerToDecibels2D(buffer2D, min) {
    // get max value in 2d array: https://stackoverflow.com/questions/39342575/max-value-of-a-multidimensional-array-javascript/39342787
    let maxRow = buffer2D.map(function (row) {
      return Math.max.apply(Math, row);
    });
    let MAX = Math.max.apply(null, maxRow);

    for (let idx1 = 0; idx1 < buffer2D.length; idx1++) {
      for (let idx2 = 0; idx2 < buffer2D[0].length; idx2++) {
        let newValue = linearToDecibels(buffer2D[idx1][idx2] / MAX);
        if (min !== undefined && newValue < min) {
          newValue = min;
        }
        buffer2D[idx1][idx2] = newValue;
      }
    }
}

function checkTime(i) {
    return i < 10 ? '0' + i : i;
}

function getTime() {
    let today = new Date(),
      h = checkTime(today.getHours()),
      m = checkTime(today.getMinutes()),
      s = checkTime(today.getSeconds()),
      ms = checkTime(today.getMilliseconds());
    return `${h}:${m}:${s}:${ms}`;
}

function download(content, fileName, contentType) {
    let a = document.createElement('a');
    let file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

function deepCopy1D(buffer1D) {
    return buffer1D.slice();
}

function deepCopy2D(buffer2D) {
    return buffer2D.slice().map((row) => row.slice());
}
