const CONFIG = {
    topojsonUrl: "data/kalbar.topojson",
    topoObjectName: "kalimantan-barat",

    fallbackView: {
        center: [-0.9, 113.5],
        zoom: 6,
    },

    LayerStyle: {
        color: "#1d4ed8",
        weight: 1.2,
        fillColor: "#d4e2f0",
        fillOpacity: 0.1,
        opacity: 0.1,
    },

    maskStyle: {
        color: "#6b7280",
        weight: 0.2,
        fillColor: "#a0aec0",
        fillOpacity: 0.45,
        opacity: 0.3,
        interactive: false,
    },

    outlineStyle: {
        color: "#f1f5f9",
        weight: 1,
        fill: false,
        dashArray: "4 8",
        opacity: 0.5,
        interactive: false,
        pad: 0.02,
    },

    boundsPadding: [30, 30],
    maxBoundsPad: 0.15,

    tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    tileOptions: {
        maxZoom: 18,
        attribution: "© OpenStreetMap",
    },

    errorPopup: {
        latlng: [0, 114],
        html: "TopoJSON tidak ditemukan",
    },
};

const savedLocations = [];
let tempMarker = null;
let mapInstance = null;

(function () {
    const map = L.map("map", {
        zoomSnap: 0.5,
        wheelPxPerZoomLevel: 80,
    });

    mapInstance = map;

    map.getContainer().style.outline = "none";
    map.getContainer().tabIndex = -1;

    L.tileLayer(CONFIG.tileUrl, CONFIG.tileOptions).addTo(map);

    map.on("click", function (e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);

        document.getElementById("latInput").value = lat;
        document.getElementById("lngInput").value = lng;

        if (tempMarker) {
            map.removeLayer(tempMarker);
        }

        tempMarker = L.marker([lat, lng], {
            draggable: true,
        }).addTo(map);

        tempMarker.on("dragend", function () {
            const pos = tempMarker.getLatLng();

            document.getElementById("latInput").value = pos.lat.toFixed(6);
            document.getElementById("lngInput").value = pos.lng.toFixed(6);
        });
    });

    fetch(CONFIG.topojsonUrl)
        .then((res) => {
            if (!res.ok) throw new Error(res.status);
            return res.json();
        })
        .then((topoData) => {
            const geoData = topojson.feature(
                topoData,
                topoData.objects[CONFIG.topoObjectName],
            );

            const Layer = L.geoJSON(geoData, {
                style: CONFIG.LayerStyle,
                onEachFeature: (f, l) => {
                    const name = f.properties?.name || "Area";
                    l.bindTooltip(name, { direction: "center" });
                },
            }).addTo(map);

            const bounds = Layer.getBounds();

            map.fitBounds(bounds, {
                padding: CONFIG.boundsPadding,
            });
            map.setMaxBounds(bounds.pad(CONFIG.maxBoundsPad));

            const holes = [];

            function extract(g) {
                if (!g) return;

                if (g.type === "Polygon") {
                    holes.push(g.coordinates[0]);
                }

                if (g.type === "MultiPolygon") {
                    g.coordinates.forEach((p) => {
                        holes.push(p[0]);
                    });
                }
            }

            geoData.features.forEach((f) => extract(f.geometry));

            const world = [
                [-180, -90],
                [180, -90],
                [180, 90],
                [-180, 90],
                [-180, -90],
            ];

            if (holes.length) {
                const mask = {
                    type: "Polygon",
                    coordinates: [world, ...holes],
                };

                const maskLayer = L.geoJSON(mask, {
                    style: CONFIG.maskStyle,
                }).addTo(map);

                maskLayer.bringToBack();
                Layer.bringToFront();
            }

            L.rectangle(bounds.pad(CONFIG.outlineStyle.pad), {
                ...CONFIG.outlineStyle,
            }).addTo(map);
        })
        .catch(() => {
            L.popup({ closeButton: false })
                .setLatLng(CONFIG.errorPopup.latlng)
                .setContent(CONFIG.errorPopup.html)
                .openOn(map);

            map.setView(CONFIG.fallbackView.center, CONFIG.fallbackView.zoom);
        });
})();

function saveLocation() {
    const name = document.getElementById("nameInput").value;
    const lat = parseFloat(document.getElementById("latInput").value);
    const lng = parseFloat(document.getElementById("lngInput").value);

    if (!lat || !lng) {
        alert("Klik map dulu untuk menentukan lokasi");
        return;
    }

    const data = {
        name: name,
        lat: lat,
        lng: lng,
    };

    savedLocations.push(data);

    const marker = L.marker([lat, lng]).addTo(mapInstance);

    marker.bindPopup(`
        <b>${name}</b><br>
        ${lat}, ${lng}
    `);

    tempMarker = null;

    document.getElementById("nameInput").value = "";
    document.getElementById("latInput").value = "";
    document.getElementById("lngInput").value = "";

    console.log(savedLocations);
}
