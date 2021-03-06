// NOCOMPILE
import _ol_Map_ from '../src/ol/Map.js';
import _ol_View_ from '../src/ol/View.js';
import {defaults as defaultControls} from '../src/ol/control.js';
import TileLayer from '../src/ol/layer/Tile.js';
import _ol_math_ from '../src/ol/math.js';
import _ol_source_OSM_ from '../src/ol/source/OSM.js';

var view = new _ol_View_({
  center: [0, 0],
  zoom: 2
});
var map = new _ol_Map_({
  layers: [
    new TileLayer({
      source: new _ol_source_OSM_()
    })
  ],
  target: 'map',
  controls: defaultControls({
    attributionOptions: {
      collapsible: false
    }
  }),
  view: view
});

function el(id) {
  return document.getElementById(id);
}


var gn = new GyroNorm();

gn.init().then(function() {
  gn.start(function(event) {
    var center = view.getCenter();
    var resolution = view.getResolution();
    var alpha = _ol_math_.toRadians(event.do.beta);
    var beta = _ol_math_.toRadians(event.do.beta);
    var gamma = _ol_math_.toRadians(event.do.gamma);

    el('alpha').innerText = alpha + ' [rad]';
    el('beta').innerText = beta + ' [rad]';
    el('gamma').innerText = gamma + ' [rad]';

    center[0] -= resolution * gamma * 25;
    center[1] += resolution * beta * 25;

    view.setCenter(view.constrainCenter(center));
  });
});
