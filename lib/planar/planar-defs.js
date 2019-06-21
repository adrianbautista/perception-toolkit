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
  class ModuleMock {
      constructor(invalidMalloc = false, mallocOffset = 0) {
          this.invalidMalloc = invalidMalloc;
          this.mallocOffset = mallocOffset;
          this.preRun = [];
      }
      _malloc(size) {
          if (this.invalidMalloc) {
              return null;
          }
          this.memory = new ArrayBuffer(this.mallocOffset + size);
          return this.mallocOffset;
      }
      get HEAPU8() {
          return new Uint8Array(this.memory);
      }
      get HEAPU32() {
          return new Uint32Array(this.memory);
      }
      get HEAPF32() {
          return new Float32Array(this.memory);
      }
      get HEAPF64() {
          return new Float64Array(this.memory);
      }
      get __memory() {
          return this.memory;
      }
      _free(_) {
          this.memory = null;
      }
      _addObjectIndexWithId(objectId, size, indexPtr) {
          // Stub.
      }
      _cancelObjectId(objectId) {
          // Stub.
      }
      process(_) {
          return {
              get: () => ({ id: 1 }),
              size: () => 1,
          };
      }
  }

  exports.ModuleMock = ModuleMock;

  return exports;

}({}));
