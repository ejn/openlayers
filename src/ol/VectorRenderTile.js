/**
 * @module ol/VectorRenderTile
 */
import {getUid} from './util.js';
import Tile from './Tile.js';
import {createCanvasContext2D} from './dom.js';


/**
 * @typedef {Object} ReplayState
 * @property {boolean} dirty
 * @property {null|import("./render.js").OrderFunction} renderedRenderOrder
 * @property {number} renderedTileRevision
 * @property {number} renderedResolution
 * @property {number} renderedRevision
 * @property {number} renderedZ
 * @property {number} renderedTileResolution
 * @property {number} renderedTileZ
 */

/**
 * @type {Array<HTMLCanvasElement>}
 */
const canvasPool = [];

class VectorRenderTile extends Tile {

  /**
   * @param {import("./tilecoord.js").TileCoord} tileCoord Tile coordinate.
   * @param {import("./TileState.js").default} state State.
   * @param {import("./tilecoord.js").TileCoord} urlTileCoord Wrapped tile coordinate for source urls.
   * @param {function(VectorRenderTile):Array<import("./VectorTile").default>} getSourceTiles Function
   * to get source tiles for this tile.
   */
  constructor(tileCoord, state, urlTileCoord, getSourceTiles) {

    super(tileCoord, state, {transition: 0});

    /**
     * @private
     * @type {!Object<string, CanvasRenderingContext2D>}
     */
    this.context_ = {};

    /**
     * Executor groups by layer uid. Entries are read/written by the renderer.
     * @type {Object<string, Array<import("./render/canvas/ExecutorGroup.js").default>>}
     */
    this.executorGroups = {};

    /**
     * Number of loading source tiles. Read/written by the source.
     * @type {number}
     */
    this.loadingSourceTiles = 0;

    /**
     * Tile keys of error source tiles. Read/written by the source.
     * @type {Object<string, boolean>}
     */
    this.errorSourceTileKeys = {};

    /**
     * @type {Object<number, ImageData>}
     */
    this.hitDetectionImageData = {};

    /**
     * @private
     * @type {!Object<string, ReplayState>}
     */
    this.replayState_ = {};

    /**
     * @type {Array<import("./VectorTile.js").default>}
     */
    this.sourceTiles = null;

    /**
     * @type {number}
     */
    this.wantedResolution;

    /**
     * @type {!function():Array<import("./VectorTile.js").default>}
     */
    this.getSourceTiles = getSourceTiles.bind(undefined, this);

    /**
     * z of the source tiles of the last getSourceTiles call.
     * @type {number}
     */
    this.sourceZ = -1;

    /**
     * True when all tiles for this tile's nominal resolution are available.
     * @type {boolean}
     */
    this.hifi = false;

    /**
     * @type {import("./tilecoord.js").TileCoord}
     */
    this.wrappedTileCoord = urlTileCoord;
  }

  /**
   * @param {import("./layer/Layer.js").default} layer Layer.
   * @return {CanvasRenderingContext2D} The rendering context.
   */
  getContext(layer) {
    const key = getUid(layer);
    if (!(key in this.context_)) {
      this.context_[key] = createCanvasContext2D(1, 1, canvasPool);
    }
    return this.context_[key];
  }

  /**
   * @param {import("./layer/Layer.js").default} layer Layer.
   * @return {boolean} Tile has a rendering context for the given layer.
   */
  hasContext(layer) {
    return getUid(layer) in this.context_;
  }

  /**
   * Get the Canvas for this tile.
   * @param {import("./layer/Layer.js").default} layer Layer.
   * @return {HTMLCanvasElement} Canvas.
   */
  getImage(layer) {
    return this.hasContext(layer) ? this.getContext(layer).canvas : null;
  }

  /**
   * @param {import("./layer/Layer.js").default} layer Layer.
   * @return {ReplayState} The replay state.
   */
  getReplayState(layer) {
    const key = getUid(layer);
    if (!(key in this.replayState_)) {
      this.replayState_[key] = {
        dirty: false,
        renderedRenderOrder: null,
        renderedResolution: NaN,
        renderedRevision: -1,
        renderedTileResolution: NaN,
        renderedTileRevision: -1,
        renderedZ: -1,
        renderedTileZ: -1
      };
    }
    return this.replayState_[key];
  }

  /**
   * Load the tile.
   */
  load() {
    this.getSourceTiles();
  }

  /**
   * Remove from the cache due to expiry
   */
  release() {
    for (const key in this.context_) {
      canvasPool.push(this.context_[key].canvas);
    }
    super.release();
  }
}


export default VectorRenderTile;
