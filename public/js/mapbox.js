/* eslint-disable */
export const displayMap = (locations) => {
  try {
    const mapSetup = () => {
      mapboxgl.accessToken =
        'pk.eyJ1IjoiaHVnb3BjdmVsb3NvIiwiYSI6ImNrbDB1ZGpmMTV6cmUydnF0eTgxcHdrOG0ifQ.pua0YPFGxJuj_gwVRj44KA';

      const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/hugopcveloso/ckl0ume9i0k1r17o5xr0xwbzq',
        center: [-119.472324, 42.540793],
        zoom: 5,
        scrollZoom: false,
      });

      const bounds = new mapboxgl.LngLatBounds();

      locations.forEach((location) => {
        // Creates a marker
        const el = document.createElement('div');
        el.className = 'marker';
        // Adds the marker
        new mapboxgl.Marker({
          element: el,
          anchor: 'bottom', //the markers bottom pinpoints the location
        })
          .setLngLat(location.coordinates)
          .addTo(map);
        // Add popup
        new mapboxgl.Popup({
          offset: 40,
        })
          .setLngLat(location.coordinates)
          .setHTML(
            `<p> <strong>Day ${location.day}</strong> : ${location.description}</p>`
          )
          .addTo(map);
        // Extend map bounds to include current location

        bounds.extend(location.coordinates);
      });

      map.on('load', function () {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: locations.map((el) => el.coordinates),
            },
          },
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': 'red',
            'line-width': 3,
            'line-dasharray': [3, 3],
          },
        });
      });

      map.fitBounds(bounds, {
        padding: {
          top: 200,
          bottom: 150,
          left: 100,
          right: 100,
        },
      });
    };
    mapSetup();
  } catch (err) {
    console.log(err.message);
  }
};
