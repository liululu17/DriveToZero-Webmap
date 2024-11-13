// Initialize the map
const map = L.map('map').setView([25, 15], 3); // Set initial view

// Create custom panes
map.createPane('basePane').style.zIndex = 100;
map.createPane('vectorPane').style.zIndex = 200;
map.createPane('labelsPane').style.zIndex = 300; // Highest zIndex for labels

// Add a tile layer
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    pane: 'basePane',
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Color codes for endorsers
function getEndorserColor(category) {
    return category === 'Finance' ? '#0095D3' :
           category === 'Fleets and Users' ? '#5CC4BD' :
           category === 'Knowledge and Service Organ' ? '#9C6EB0' :
           category === 'Manufacturers and Suppliers' ? '#D1D439' :
           category === 'Other' ? '#FF9E18' :
           category === 'Subnational Governments' ? '#EF4E00' :
           category === 'Utilities and Infrastructure Providers' ? '#76BC21' :
           '#ffffff'; // Default color if category doesn't match
}

// Color codes for gdp
function getColor(gdp) {
    return gdp >= 27360000000000.0 ? '#081D58' :
           gdp >= 1025602500000.0 ? '#17347B' :
           gdp >= 511432500000.0  ? '#225EA8' :
           gdp >= 331112500000.0  ? '#1D91C0' :
           gdp >= 245838000000.0  ? '#41B6C4' :
           gdp >= 90867500000.0  ? '#7FCDBB' :
           gdp >= 77022500000.0  ? '#C7E9B4' :
           gdp >= 12332500000.0  ? '#EDF8B1' :
           gdp >= 520000000.0  ? '#FFFFD9' :
                             '#f7fbff';
}


// Define style for each feature
function style(feature) {
    return {
        fillColor: getColor(feature.properties.GDP), 
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.8
    };
}

// GDP Layer
const gdpLayer = L.geoJson(null, {
    style: style,
    onEachFeature: function (feature, layer) {
        layer.bindPopup(`<strong>Country:</strong> ${feature.properties.name}<br><strong>GDP:</strong> $${feature.properties.GDP}`);
    }
});

// Load the GDP data and add to map
fetch('country_gdp.geojson')
    .then(response => response.json())
    .then(data => gdpLayer.addData(data))
    .catch(error => console.log("Error loading GDP GeoJSON data:", error));

// Function to get CSS class based on category color
function getCategoryClass(category) {
    return category === 'Finance' ? 'cluster-finance' :
           category === 'Fleets and Users' ? 'cluster-fleets' :
           category === 'Knowledge and Service Organ' ? 'cluster-knowledge' :
           category === 'Manufacturers and Suppliers' ? 'cluster-manufacturers' :
           category === 'Other' ? 'cluster-other' :
           category === 'Subnational Governments' ? 'cluster-subnational' :
           category === 'Utilities and Infrastructure Providers' ? 'cluster-utilities' :
           'cluster-default'; // Default class if category doesn't match
}

// Create the cluster group with custom icon creation
const endorserCluster = L.markerClusterGroup({
    iconCreateFunction: function(cluster) {
        const markers = cluster.getAllChildMarkers();
        const categoryCounts = {};

        // Count occurrences of each category in the cluster
        markers.forEach(marker => {
            const category = marker.feature && marker.feature.properties ? marker.feature.properties.Category : null;
            if (category) {
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            }
        });

        // Determine the most common category in the cluster
        const mostCommonCategory = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b);
        const categoryClass = getCategoryClass(mostCommonCategory);

        // Set base size and maximum size for the clusters
        const baseSize = 30; // Base size for small clusters
        const maxSize = 100; // Maximum size for large clusters
        const calculatedSize = baseSize + (cluster.getChildCount() * 2);
        const size = Math.min(calculatedSize, maxSize); // Cap the size at maxSize

        return L.divIcon({
            html: `<div><span>${cluster.getChildCount()}</span></div>`,
            className: `custom-cluster ${categoryClass}`,
            iconSize: L.point(size, size),
            iconAnchor: [size / 2, size / 2]
        });
    }
});

// Load endorsers GeoJSON and add to map with clustering
fetch('endorser.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJson(data, {
            pointToLayer: function (feature, latlng) {
                const color = getEndorserColor(feature.properties.Category); // Use Category to set color
                return L.circleMarker(latlng, {
                    radius: 10,
                    fillColor: color,
                    color: '#FFFFFF', // White border for contrast
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 1
                }).bindPopup(`<strong>Name:</strong> ${feature.properties['Name']}<br><strong>Website:</strong> <a href="${feature.properties.Website}" target="_blank">${feature.properties.Website}</a>`);
            }
        }).addTo(endorserCluster);
    })
    .catch(error => console.log("Error loading endorsers GeoJSON data:", error));


// Add vector layers to vectorPane
gdpLayer.options.pane = 'vectorPane';
gdpLayer.addTo(map);

endorserCluster.options.pane = 'vectorPane';
endorserCluster.addTo(map);

// Add layer control with overlay options
L.control.layers(null, {
    'GDP Layer': gdpLayer,
    'Endorsers': endorserCluster
}).addTo(map);

// Add a combined legend for Endorsers and GDP
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    div.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'; // 50% white background
    div.style.padding = '10px';
    div.style.borderRadius = '8px';

    // Endorsers Section
    const categories = [
        { color: '#0095D3', label: 'Finance' },
        { color: '#5CC4BD', label: 'Fleets and Users' },
        { color: '#9C6EB0', label: 'Knowledge and Service Organi' },
        { color: '#D1D439', label: 'Manufacturers and Suppliers' },
        { color: '#FF9E18', label: 'Other' },
        { color: '#EF4E00', label: 'Subnational Governments' },
        { color: '#76BC21', label: 'Utilities and Infrastructure Providers' }
    ];
    
    div.innerHTML += '<strong>Endorsers</strong><br>';
    categories.forEach(cat => {
        div.innerHTML += `<i style="background:${cat.color}; width: 18px; height: 18px; display: inline-block; margin-right: 8px;"></i> ${cat.label}<br>`;
    });

    // GDP Section
    const gdpGrades = [520000000, 12332500000, 77022500000, 90867500000, 245838000000, 331112500000, 511432500000, 1025602500000, 27360000000000];
    div.innerHTML += '<br><strong>GDP (Billions)</strong><br>';
    for (let i = 0; i < gdpGrades.length; i++) {
        const color = getColor(gdpGrades[i] + 1);
        div.innerHTML += `<i style="background:${color}; width: 18px; height: 18px; display: inline-block; margin-right: 8px;"></i> ${(gdpGrades[i] / 1e9).toFixed(1)}${gdpGrades[i + 1] ? `&ndash;${(gdpGrades[i + 1] / 1e9).toFixed(1)}` : '+'}B<br>`;
    }

    return div;
};

legend.addTo(map);


// Add the label layer to labelsPane to ensure it's on top
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    pane: 'labelsPane',
    attribution: '',
}).addTo(map);

// Add the Geocoder to the map
L.Control.geocoder({
    defaultMarkGeocode: true
}).addTo(map);