/**
 * @module ol/Geolocation
 */
import {inherits} from './index.js';
import _ol_GeolocationProperty_ from './GeolocationProperty.js';
import _ol_Object_ from './Object.js';
import _ol_Sphere_ from './Sphere.js';
import _ol_events_ from './events.js';
import EventType from './events/EventType.js';
import Polygon from './geom/Polygon.js';
import _ol_has_ from './has.js';
import _ol_math_ from './math.js';
import {get as getProjection, getTransformFromProjections, identityTransform} from './proj.js';
import _ol_proj_EPSG4326_ from './proj/EPSG4326.js';


/**
 * @typedef {{tracking: (boolean|undefined),
 *     trackingOptions: (GeolocationPositionOptions|undefined),
 *     projection: ol.ProjectionLike}}
 */
export var GeolocationOptions;


/**
 * @classdesc
 * Helper class for providing HTML5 Geolocation capabilities.
 * The [Geolocation API](http://www.w3.org/TR/geolocation-API/)
 * is used to locate a user's position.
 *
 * To get notified of position changes, register a listener for the generic
 * `change` event on your instance of `ol.Geolocation`.
 *
 * Example:
 *
 *     var geolocation = new ol.Geolocation({
 *       // take the projection to use from the map's view
 *       projection: view.getProjection()
 *     });
 *     // listen to changes in position
 *     geolocation.on('change', function(evt) {
 *       window.console.log(geolocation.getPosition());
 *     });
 *
 * @fires error
 * @constructor
 * @extends {ol.Object}
 * @param {GeolocationOptions=} opt_options Options.
 * @param {boolean|undefined} opt_options.tracking Start Tracking. Default is
 *     `false`.
 * @param {GeolocationPositionOptions|undefined} opt_options.trackingOptions
 *     Tracking options. See
 *     {@link http://www.w3.org/TR/geolocation-API/#position_options_interface}.
 * @param {ol.ProjectionLike} opt_options.projection The projection the position
 *     is reported in.
 * @api
 */
var Geolocation = function(opt_options) {

  _ol_Object_.call(this);

  var options = opt_options || {};

  /**
   * The unprojected (EPSG:4326) device position.
   * @private
   * @type {ol.Coordinate}
   */
  this.position_ = null;

  /**
   * @private
   * @type {ol.TransformFunction}
   */
  this.transform_ = identityTransform;

  /**
   * @private
   * @type {ol.Sphere}
   */
  this.sphere_ = new _ol_Sphere_(_ol_proj_EPSG4326_.RADIUS);

  /**
   * @private
   * @type {number|undefined}
   */
  this.watchId_ = undefined;

  _ol_events_.listen(
      this, _ol_Object_.getChangeEventType(_ol_GeolocationProperty_.PROJECTION),
      this.handleProjectionChanged_, this);
  _ol_events_.listen(
      this, _ol_Object_.getChangeEventType(_ol_GeolocationProperty_.TRACKING),
      this.handleTrackingChanged_, this);

  if (options.projection !== undefined) {
    this.setProjection(options.projection);
  }
  if (options.trackingOptions !== undefined) {
    this.setTrackingOptions(options.trackingOptions);
  }

  this.setTracking(options.tracking !== undefined ? options.tracking : false);

};

inherits(Geolocation, _ol_Object_);


/**
 * @inheritDoc
 */
Geolocation.prototype.disposeInternal = function() {
  this.setTracking(false);
  _ol_Object_.prototype.disposeInternal.call(this);
};


/**
 * @private
 */
Geolocation.prototype.handleProjectionChanged_ = function() {
  var projection = this.getProjection();
  if (projection) {
    this.transform_ = getTransformFromProjections(
        getProjection('EPSG:4326'), projection);
    if (this.position_) {
      this.set(
          _ol_GeolocationProperty_.POSITION, this.transform_(this.position_));
    }
  }
};


/**
 * @private
 */
Geolocation.prototype.handleTrackingChanged_ = function() {
  if (_ol_has_.GEOLOCATION) {
    var tracking = this.getTracking();
    if (tracking && this.watchId_ === undefined) {
      this.watchId_ = navigator.geolocation.watchPosition(
          this.positionChange_.bind(this),
          this.positionError_.bind(this),
          this.getTrackingOptions());
    } else if (!tracking && this.watchId_ !== undefined) {
      navigator.geolocation.clearWatch(this.watchId_);
      this.watchId_ = undefined;
    }
  }
};


/**
 * @private
 * @param {GeolocationPosition} position position event.
 */
Geolocation.prototype.positionChange_ = function(position) {
  var coords = position.coords;
  this.set(_ol_GeolocationProperty_.ACCURACY, coords.accuracy);
  this.set(_ol_GeolocationProperty_.ALTITUDE,
      coords.altitude === null ? undefined : coords.altitude);
  this.set(_ol_GeolocationProperty_.ALTITUDE_ACCURACY,
      coords.altitudeAccuracy === null ?
        undefined : coords.altitudeAccuracy);
  this.set(_ol_GeolocationProperty_.HEADING, coords.heading === null ?
    undefined : _ol_math_.toRadians(coords.heading));
  if (!this.position_) {
    this.position_ = [coords.longitude, coords.latitude];
  } else {
    this.position_[0] = coords.longitude;
    this.position_[1] = coords.latitude;
  }
  var projectedPosition = this.transform_(this.position_);
  this.set(_ol_GeolocationProperty_.POSITION, projectedPosition);
  this.set(_ol_GeolocationProperty_.SPEED,
      coords.speed === null ? undefined : coords.speed);
  var geometry = Polygon.circular(
      this.sphere_, this.position_, coords.accuracy);
  geometry.applyTransform(this.transform_);
  this.set(_ol_GeolocationProperty_.ACCURACY_GEOMETRY, geometry);
  this.changed();
};

/**
 * Triggered when the Geolocation returns an error.
 * @event error
 * @api
 */

/**
 * @private
 * @param {GeolocationPositionError} error error object.
 */
Geolocation.prototype.positionError_ = function(error) {
  error.type = EventType.ERROR;
  this.setTracking(false);
  this.dispatchEvent(/** @type {{type: string, target: undefined}} */ (error));
};


/**
 * Get the accuracy of the position in meters.
 * @return {number|undefined} The accuracy of the position measurement in
 *     meters.
 * @observable
 * @api
 */
Geolocation.prototype.getAccuracy = function() {
  return (
    /** @type {number|undefined} */ this.get(_ol_GeolocationProperty_.ACCURACY)
  );
};


/**
 * Get a geometry of the position accuracy.
 * @return {?ol.geom.Polygon} A geometry of the position accuracy.
 * @observable
 * @api
 */
Geolocation.prototype.getAccuracyGeometry = function() {
  return (
    /** @type {?ol.geom.Polygon} */ this.get(_ol_GeolocationProperty_.ACCURACY_GEOMETRY) || null
  );
};


/**
 * Get the altitude associated with the position.
 * @return {number|undefined} The altitude of the position in meters above mean
 *     sea level.
 * @observable
 * @api
 */
Geolocation.prototype.getAltitude = function() {
  return (
    /** @type {number|undefined} */ this.get(_ol_GeolocationProperty_.ALTITUDE)
  );
};


/**
 * Get the altitude accuracy of the position.
 * @return {number|undefined} The accuracy of the altitude measurement in
 *     meters.
 * @observable
 * @api
 */
Geolocation.prototype.getAltitudeAccuracy = function() {
  return (
    /** @type {number|undefined} */ this.get(_ol_GeolocationProperty_.ALTITUDE_ACCURACY)
  );
};


/**
 * Get the heading as radians clockwise from North.
 * @return {number|undefined} The heading of the device in radians from north.
 * @observable
 * @api
 */
Geolocation.prototype.getHeading = function() {
  return (
    /** @type {number|undefined} */ this.get(_ol_GeolocationProperty_.HEADING)
  );
};


/**
 * Get the position of the device.
 * @return {ol.Coordinate|undefined} The current position of the device reported
 *     in the current projection.
 * @observable
 * @api
 */
Geolocation.prototype.getPosition = function() {
  return (
    /** @type {ol.Coordinate|undefined} */ this.get(_ol_GeolocationProperty_.POSITION)
  );
};


/**
 * Get the projection associated with the position.
 * @return {ol.proj.Projection|undefined} The projection the position is
 *     reported in.
 * @observable
 * @api
 */
Geolocation.prototype.getProjection = function() {
  return (
    /** @type {ol.proj.Projection|undefined} */ this.get(_ol_GeolocationProperty_.PROJECTION)
  );
};


/**
 * Get the speed in meters per second.
 * @return {number|undefined} The instantaneous speed of the device in meters
 *     per second.
 * @observable
 * @api
 */
Geolocation.prototype.getSpeed = function() {
  return (
    /** @type {number|undefined} */ this.get(_ol_GeolocationProperty_.SPEED)
  );
};


/**
 * Determine if the device location is being tracked.
 * @return {boolean} The device location is being tracked.
 * @observable
 * @api
 */
Geolocation.prototype.getTracking = function() {
  return (
    /** @type {boolean} */ this.get(_ol_GeolocationProperty_.TRACKING)
  );
};


/**
 * Get the tracking options.
 * @see http://www.w3.org/TR/geolocation-API/#position-options
 * @return {GeolocationPositionOptions|undefined} PositionOptions as defined by
 *     the [HTML5 Geolocation spec
 *     ](http://www.w3.org/TR/geolocation-API/#position_options_interface).
 * @observable
 * @api
 */
Geolocation.prototype.getTrackingOptions = function() {
  return (
    /** @type {GeolocationPositionOptions|undefined} */ this.get(_ol_GeolocationProperty_.TRACKING_OPTIONS)
  );
};


/**
 * Set the projection to use for transforming the coordinates.
 * @param {ol.ProjectionLike} projection The projection the position is
 *     reported in.
 * @observable
 * @api
 */
Geolocation.prototype.setProjection = function(projection) {
  this.set(_ol_GeolocationProperty_.PROJECTION, getProjection(projection));
};


/**
 * Enable or disable tracking.
 * @param {boolean} tracking Enable tracking.
 * @observable
 * @api
 */
Geolocation.prototype.setTracking = function(tracking) {
  this.set(_ol_GeolocationProperty_.TRACKING, tracking);
};


/**
 * Set the tracking options.
 * @see http://www.w3.org/TR/geolocation-API/#position-options
 * @param {GeolocationPositionOptions} options PositionOptions as defined by the
 *     [HTML5 Geolocation spec
 *     ](http://www.w3.org/TR/geolocation-API/#position_options_interface).
 * @observable
 * @api
 */
Geolocation.prototype.setTrackingOptions = function(options) {
  this.set(_ol_GeolocationProperty_.TRACKING_OPTIONS, options);
};
export default Geolocation;
