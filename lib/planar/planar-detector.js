var Planar = (function (exports) {
  'use strict';

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     https://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * Represents the debug level for logging.
   */
  var DEBUG_LEVEL;
  (function (DEBUG_LEVEL) {
      /**
       * No messages.
       */
      DEBUG_LEVEL[DEBUG_LEVEL["NONE"] = 0] = "NONE";
      /**
       * Errors.
       */
      DEBUG_LEVEL[DEBUG_LEVEL["ERROR"] = 1] = "ERROR";
      /**
       * Warnings.
       */
      DEBUG_LEVEL[DEBUG_LEVEL["WARNING"] = 2] = "WARNING";
      /**
       * Info.
       */
      DEBUG_LEVEL[DEBUG_LEVEL["INFO"] = 3] = "INFO";
      /**
       * All messages.
       */
      DEBUG_LEVEL[DEBUG_LEVEL["VERBOSE"] = 4] = "VERBOSE";
  })(DEBUG_LEVEL || (DEBUG_LEVEL = {}));
  /**
   * Logs a message.
   *
   * ```javascript
   *
   * // Enable ERROR and WARNING messages.
   * enableLogLevel(DEBUG_LEVEL.WARNING);
   *
   * // Ignored.
   * log('Bar!', DEBUG_LEVEL.INFO);
   *
   * // A tagged message.
   * log('Foo!', DEBUG_LEVEL.WARNING, 'some tag');
   *
   * // A non-tagged message.
   * log('Baz!', DEBUG_LEVEL.ERROR)
   * ```
   */
  function log(msg, level = DEBUG_LEVEL.INFO, tag) {
      if (typeof DEBUG === 'undefined' || level > DEBUG) {
          return;
      }
      const label = applyTagIfProvided(level, tag);
      switch (level) {
          case DEBUG_LEVEL.ERROR:
              console.error(label, msg);
              break;
          case DEBUG_LEVEL.WARNING:
              console.warn(label, msg);
              break;
          default:
              console.log(label, msg);
              break;
      }
  }
  function applyTagIfProvided(label, tag) {
      let labelStr = '';
      switch (label) {
          case DEBUG_LEVEL.WARNING:
              labelStr = 'WARNING';
              break;
          case DEBUG_LEVEL.ERROR:
              labelStr = 'ERROR';
              break;
          default:
              labelStr = 'INFO';
              break;
      }
      if (!tag) {
          return `${labelStr}:`;
      }
      return `${labelStr} [${tag}]:`;
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     https://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  class WasmHeapWriter {
      constructor(size) {
          this.ptr = Module._malloc(size);
          if (typeof this.ptr === 'undefined' || this.ptr === null) {
              throw new Error(`Malloc failed: size (${size})`);
          }
          this.size = size;
          this.uint8View =
              new Uint8Array(Module.HEAPU8.buffer, this.ptr, size);
          this.uint32View =
              new Uint32Array(Module.HEAPU32.buffer, this.ptr, size >> 2);
          this.float32View =
              new Float32Array(Module.HEAPF32.buffer, this.ptr, size >> 2);
          this.float64View =
              new Float64Array(Module.HEAPF64.buffer, this.ptr, size >> 3);
          this.offset = 0;
      }
      snapToWordAlignment() {
          const inWordOffset = this.offset % 4;
          if (inWordOffset === 0) {
              return;
          }
          this.offset += 4 - inWordOffset;
      }
      snapToDoubleWordAlignment() {
          const inWordOffset = this.offset % 8;
          if (inWordOffset === 0) {
              return;
          }
          this.offset += 8 - inWordOffset;
      }
      writeUint8(value) {
          this.uint8View[this.offset] = value;
          this.offset += 1;
      }
      writeBool(value) {
          /* istanbul ignore else */
          if (typeof value === 'boolean') {
              value = value ? 1 : 0;
          }
          this.writeUint8(value);
      }
      writeInt32(value) {
          this.snapToWordAlignment();
          this.uint32View[this.offset >> 2] = value;
          this.offset += 4;
      }
      writeFloat64(value) {
          this.snapToDoubleWordAlignment();
          this.float64View[this.offset >> 3] = value;
          this.offset += 8;
      }
      writePtr(value) {
          this.writeInt32(value);
      }
      writeFloat(value) {
          this.snapToWordAlignment();
          this.float32View[this.offset >> 2] = value;
          this.offset += 4;
      }
      // Caller takes ownership of the returned pointer.
      getData(warnOnByteMismatch = false) {
          this.snapToWordAlignment();
          const bytesWritten = this.offset;
          /* istanbul ignore next */
          if (warnOnByteMismatch && bytesWritten !== this.size) {
              console.error('wrote ' + bytesWritten + ' bytes, but expected to write ' +
                  this.size);
          }
          const ptr = this.ptr;
          this.ptr = null;
          return ptr;
      }
  }

  /**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     https://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  /**
   * A class for processing image frames and returning any planar target
   * detections.
   */
  class PlanarTargetDetector {
      constructor() {
          this.hasLoaded = false;
          this.pixelsPtr = null;
          this.pixelsSize = 0;
          Module.preRun.push(() => {
              this.hasLoaded = true;
          });
      }
      // Bindings into C++
      /**
       * Takes the relevant information from the JS image frame and hands it off
       * to C++ for processing to determine planar target detections.
       * @param {!ImageData} imageData The raw image data for the current frame.
       * @param {number} timestamp The timestamp of the current frame, in ms.
       * @return {!QuadVec} embind-created structure holding a vector of
       *     {!QuadDetection} objects. Structure is autogenerated from
       *     planar_target_detector_internal.cc, so please see there for more info.
       */
      process(imageData, timestamp) {
          /* istanbul ignore else */
          if (!this.hasLoaded) {
              return {
                  get: (r) => ({ id: 0 }),
                  size: () => 0,
              };
          }
          const width = imageData.width;
          const height = imageData.height;
          // (Re-)allocate image memory space if needed.
          const size = 4 * width * height;
          if (this.pixelsSize !== size) {
              /* istanbul ignore if */
              if (this.pixelsPtr) {
                  Module._free(this.pixelsPtr);
              }
              this.pixelsPtr = Module._malloc(size);
              this.pixelsSize = size;
          }
          /* istanbul ignore if */
          if (this.pixelsPtr === null) {
              throw new Error('Unable to reserve pixel pointer with malloc');
          }
          Module.HEAPU8.set(imageData.data, this.pixelsPtr);
          const wasmHeapWriterByteCount = 24; // 4 ints and 1 ll (timestamp)
          const frameDataWriter = new WasmHeapWriter(wasmHeapWriterByteCount);
          // Order matters here, and must follow the C++ layout in FrameData struct.
          // We add one more int here for proper padding for timestamp.
          frameDataWriter.writeInt32(0); // padding.
          frameDataWriter.writeInt32(width);
          frameDataWriter.writeInt32(height);
          frameDataWriter.writePtr(this.pixelsPtr);
          frameDataWriter.writeFloat64(timestamp);
          const frameDataPtr = frameDataWriter.getData();
          /* istanbul ignore if */
          if (frameDataPtr === null) {
              throw new Error('Unable to obtain data');
          }
          // We use embind version so we can tap more easily into std::vector
          const outputVec = Module.process(frameDataPtr);
          Module._free(frameDataPtr);
          return outputVec;
      }
      /**
       * Takes a Uint8Array containing the raw byte data of a BoxDetectorIndex file
       * representing a single planar target, as well as the unique identifier to
       * use for this planar target when detecting. Will set the objectId as
       * specified, copy over the data to the shared heap for C++-side WASM
       * processing, and add it to the set of objects to detect. The unique
       * identifier should not currently be in use, and the BoxDetectorIndex data
       * must represent *only one* planar target. Whatever object identifier was
       * previously encoded into the BoxDetectorIndex data will be overwritten by
       * the new objectId.
       * @param {number} objectId The unique (non-negative) identifier to use for
       *     this object during detection. Must not be currently in use.
       * @param {!Uint8Array} detectorIndexData The array of raw byte data for a
       *     BoxDetectorIndex file, which can be generated offline using the
       *     Planar Target Indexer utility.
       */
      addDetectionWithId(objectId, detectorIndexData) {
          /* istanbul ignore if */
          if (!this.hasLoaded) {
              log('Cannot add detection until detection has started.', DEBUG_LEVEL.ERROR);
              return;
          }
          const size = detectorIndexData.length;
          const indexPtr = Module._malloc(size);
          /* istanbul ignore if */
          if (indexPtr === null) {
              log('Unable to reserve memory', DEBUG_LEVEL.ERROR, 'Planar Image Detector');
              return;
          }
          Module.HEAPU8.set(detectorIndexData, indexPtr);
          Module._addObjectIndexWithId(objectId, size, indexPtr);
          Module._free(indexPtr);
      }
      /**
       * Takes a Uint8Array containing the raw byte data of a BoxDetectorIndex file
       * representing an arbitrary number of planar targets, and copies it to the
       * shared heap for C++-side WASM processing, adding all targets to the set of
       * objects to detect. The unique identifiers for these objects should be
       * already built into the BoxDetectorIndex file.
       * @param {!Uint8Array} detectorIndexData The array of raw byte data for a
       *     BoxDetectorIndex file, which can be generated offline using the Planar
       *     Target Indexer utility.
       */
      addDetection(detectorIndexData) {
          // -1 is a special invalid identifier for processing all planar targets from
          // file data without editing.
          this.addDetectionWithId(-1, detectorIndexData);
      }
      /**
       * Takes the id of an object we currently try to detect, and removes it from
       * our dictionary of detection objects, thereby cancelling detection on it.
       * @param {number} objectId The unique identifier of the object to stop
       *     detecting.
       */
      cancelDetection(objectId) {
          /* istanbul ignore if */
          if (!this.hasLoaded) {
              log('Cannot cancel detection until detection has started.', DEBUG_LEVEL.ERROR);
              return;
          }
          Module._cancelObjectId(objectId);
      }
  }

  exports.PlanarTargetDetector = PlanarTargetDetector;

  return exports;

}({}));
