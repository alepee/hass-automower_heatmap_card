// leaflet.heat extends the global L, so it must exist before that module is evaluated.
import L from 'leaflet';

window.L = L;
