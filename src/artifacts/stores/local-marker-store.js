/**
 * @license
 * Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */


export class LocalMarkerStore {
  constructor() {
    this._markers = new Map;
  }

  addArtifact(artifact, marker) {
    let marker_value = marker.text;

    this._markers.set(marker_value, { target: marker, artifact });
  }

  findRelevantArtifacts(nearbyMarkers) {
    let ret = [];
    for (let nearbyMarker of nearbyMarkers) {
      let targetAndArtifact = this._markers.get(nearbyMarker.value);
      if (targetAndArtifact) ret.push(targetAndArtifact);
    }
    return ret;
  }
}
