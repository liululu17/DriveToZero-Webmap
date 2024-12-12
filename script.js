// Initialize the map
const map = L.map('map').setView([25, 15], 2); // Set initial view

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
           category === 'Knowledge Partners and Other Endorsers' ? '#9C6EB0' :
           category === 'Manufacturers and Suppliers' ? '#D1D439' :
           category === 'Subnational Governments' ? '#EF4E00' :
           category === 'Utilities and Infrastructure Providers' ? '#ff9e18' :
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

// Define color scale function for 'Total-ZE-MHDV'
function getMHDVColor(totalZeMhdv) {
    if (totalZeMhdv === null) {
        return '#808080'; // Grey color for NaN values
    }
    return totalZeMhdv >= 25378 ? '#081D58' :
           totalZeMhdv >= 567.75 ? '#225EA8' :
           totalZeMhdv >= 133.5  ? '#1D91C0' :
           totalZeMhdv >= 64.75  ? '#7FCDBB' :
                                   '#EDF8B1';
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

// Style function for 'Total-ZE-MHDV' visualization
function mhdvStyle(feature) {
    return {
        fillColor: getMHDVColor(feature.properties['Total-ZE-MHDV']),
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.8
    };
}

// Define style for signed countries
function signedCountryStyle(feature) {
    return {
        fillColor: '#004789', // Same color for all signed countries
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.8
    };
}

// Signed Countries Layer
const signedCountriesLayer = L.geoJson(null, {
    style: signedCountryStyle,
    onEachFeature: function (feature, layer) {
        layer.bindPopup(`<strong>Country:</strong> ${feature.properties.name}<br><strong>Status:</strong> Signed`);
    }
});

// Load the Signed Countries GeoJSON data
fetch('country_gdp.geojson')
    .then(response => response.json())
    .then(data => {
        signedCountriesLayer.addData(data); // Add the GeoJSON data directly to the layer
    })
    .catch(error => console.log("Error loading Signed Countries GeoJSON data:", error));


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

// Total-ZE-MHDV Layer
const mhdvLayer = L.geoJson(null, {
    style: mhdvStyle,
    onEachFeature: function (feature, layer) {
        layer.bindPopup(`<strong>Country:</strong> ${feature.properties.name}<br><strong>Total ZE MHDV:</strong> ${feature.properties['Total-ZE-MHDV']}`);
    }
});

// Load the 'Total-ZE-MHDV' data and add it to the map
fetch('country_gdp.geojson')
    .then(response => response.json())
    .then(data => mhdvLayer.addData(data))
    .catch(error => console.log("Error loading Total-ZE-MHDV GeoJSON data:", error));

// Function to get CSS class based on category color
function getCategoryClass(category) {
    return category === 'Finance' ? 'cluster-finance' :
           category === 'Fleets and Users' ? 'cluster-fleets' :
           category === 'Knowledge Partners and Other Endorsers' ? 'cluster-knowledge' :
           category === 'Manufacturers and Suppliers' ? 'cluster-manufacturers' :
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
                }).bindPopup(`<strong>Name:</strong> ${feature.properties['Name']}<br><strong>Website:</strong> <a href="${feature.properties.Website}" target="_blank">${feature.properties.Website}</a><br><strong>City:</strong> ${feature.properties['City']}<br><strong>Country:</strong> ${feature.properties['Nationality']}`);
            }
        }).addTo(endorserCluster);
    })
    .catch(error => console.log("Error loading endorsers GeoJSON data:", error));



// Add vector layers to vectorPane
gdpLayer.options.pane = 'vectorPane';

endorserCluster.options.pane = 'vectorPane';
endorserCluster.addTo(map);

signedCountriesLayer.options.pane = 'vectorPane';
signedCountriesLayer.addTo(map);

mhdvLayer.options.pane = 'vectorPane';

// Define categories and their colors
const endorserCategories = [
    { category: 'Finance', color: '#0095D3', displayName: 'Finance Institutions' },
    { category: 'Fleets and Users', color: '#5CC4BD', displayName: 'Fleet Owners and Operators' },
    { category: 'Knowledge Partners and Other Endorsers', color: '#9C6EB0', displayName: 'Knowledge Partners and Other Endorsers' },
    { category: 'Manufacturers and Suppliers', color: '#D1D439', displayName: 'Manufacturers and Suppliers' },
    { category: 'Subnational Governments', color: '#EF4E00', displayName: 'Subnational Governments' },
    { category: 'Utilities and Infrastructure Providers', color: '#ff9e18', displayName: 'Utilities and Infrastructure Providers' }
];

// Object to store separate category layers
const endorserCategoryLayers = {};
let endorserCategoryLayersWithColors = {}; // To store layers with color-coded labels

// Load endorsers GeoJSON and create category layers 
fetch('endorser.geojson')
    .then(response => response.json())
    .then(data => {
        endorserCategories.forEach(({ category, color, displayName }) => {
            // Create a separate layer for each category
            const categoryLayer = L.geoJson(data, {
                filter: function (feature) {
                    return feature.properties.Category === category;
                },
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 7,
                        fillColor: color,
                        color: '#FFFFFF', // White border
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 1
                    }).bindPopup(`<strong>Name:</strong> ${feature.properties.Name}<br>
                                  <strong>Website:</strong> <a href="${feature.properties.Website}" target="_blank">${feature.properties.Website}</a><br><strong>City:</strong> ${feature.properties['City']}<br><strong>Country:</strong> ${feature.properties['Nationality']}`);
                }
            });

            // Store the layer in the object and assign to vectorPane
            categoryLayer.options.pane = 'vectorPane';
            endorserCategoryLayers[category] = categoryLayer; // Add to the layers object

            // Add HTML with color for the layer control, using displayName
            const labelWithColor = `<i style="background-color: ${color}; width: 12px; height: 12px; display: inline-block; margin-right: 8px;"></i>${displayName}`;
            endorserCategoryLayersWithColors[labelWithColor] = categoryLayer; // Add to the layers with colors
        });

        // Add layer control
        L.control.layers(
            {
                'Signed Countries': signedCountriesLayer,
                'GDP of Signed Countries': gdpLayer,
                '2023 ZE MHDV Sale of Signed Countries': mhdvLayer
            },
            {
                'All Endorsers': endorserCluster,
                ...endorserCategoryLayersWithColors // Spread the category layers as optional overlays
            },
            { collapsed: false }
        ).addTo(map);
    })
    .catch(error => console.log("Error loading endorsers GeoJSON data:", error));

// Define bounding boxes for regions
const regionBounds = {
    'North America': [[20, -125.0], [52, -67.0]],
    'South America': [[-56.0, -81.0], [12.0, -35.0]],
    'Europe': [[33.0, -25.0], [70.0, 40.0]],
    'Asia': [[12.0, 85.0], [52.0, 130.0]],
    'Africa': [[-35.0, -17.0], [37.0, 52.0]],
    'Oceania': [[-50.0, 110.0], [0.0, 180.0]]
};

// Create a control for region zoom
const regionControl = L.control({ position: 'topright' });

regionControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'info region-control');
    div.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    div.style.padding = '5px'; // Reduce padding
    div.style.borderRadius = '5px'; // Reduce border radius
    div.style.boxShadow = '0 0 3px rgba(0,0,0,0.2)'; // Lighter shadow
    div.style.fontSize = '10px'; // Smaller font size

    div.innerHTML = '<strong>Zoom to Region</strong><br>';
    Object.keys(regionBounds).forEach(region => {
        const button = document.createElement('button');
        button.innerHTML = region;
        button.style.margin = '3px'; // Smaller margin
        button.style.padding = '3px 6px'; // Smaller padding
        button.style.border = 'none';
        button.style.background = '#0078D4';
        button.style.color = 'white';
        button.style.cursor = 'pointer';
        button.style.borderRadius = '3px'; // Smaller border radius
        button.style.fontSize = '10px'; // Smaller font size

        button.onclick = function () {
            map.fitBounds(regionBounds[region]);
        };

        div.appendChild(button);
    });

    return div;
};

// Add the region control to the map
regionControl.addTo(map);

    
// Add a combined legend for Endorsers and GDP
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    div.style.backgroundColor = 'rgba(255, 255, 255, 0.6)'; // 50% white background
    div.style.padding = '10px';
    div.style.borderRadius = '8px';
    div.style.fontSize = '10px';

    // Total-ZE-MHDV Section
    const mhdvGrades = [1, 64.75, 133.5, 567.75, 25378];
    div.innerHTML += '<strong>Legend<br><br><strong>Total ZE MHDV Sale</strong><br>';
    // Add a color for 'NaN' values
    div.innerHTML += `<i style="background:#808080; width: 12px; height: 12px; display: inline-block; margin-right: 8px;"></i> No Data<br>`;
    for (let i = 0; i < mhdvGrades.length; i++) {
        const color = getMHDVColor(mhdvGrades[i] + 1);
        div.innerHTML += `<i style="background:${color}; width: 18px; height: 18px; display: inline-block; margin-right: 8px;"></i> ${mhdvGrades[i]}${mhdvGrades[i + 1] ? `&ndash;${mhdvGrades[i + 1]}` : '+'}<br>`;
    }

    // GDP Section
    const gdpGrades = [520000000, 12332500000, 77022500000, 90867500000, 245838000000, 331112500000, 511432500000, 1025602500000, 27360000000000];
    div.innerHTML += '<br><strong>GDP (Billions)</strong><br>';
    for (let i = 0; i < gdpGrades.length; i++) {
        const color = getColor(gdpGrades[i] + 1);
        div.innerHTML += `<i style="background:${color}; width: 18px; height: 18px; display: inline-block; margin-right: 8px;"></i> ${(gdpGrades[i] / 1e9).toFixed(1)}${gdpGrades[i + 1] ? `&ndash;${(gdpGrades[i + 1] / 1e9).toFixed(1)}` : '+'}B<br>`;
    }

    // Signed Countries Section
    div.innerHTML += '<br><strong>Signed Countries</strong><br>';
    div.innerHTML += `<i style="background:#004789; width: 18px; height: 18px; display: inline-block; margin-right: 8px;"></i> Signed Countries<br>`;

    return div;
};


legend.addTo(map);


// Define a custom control for the title and statistics
const titleControl = L.control({ position: 'bottomleft' });

titleControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'info title'); // Create a div for the title and stats
    div.style.backgroundColor = 'rgba(255, 255, 255, 0.6)'; // Semi-transparent white background
    div.style.margin = '0';
    div.style.padding = '10px';
    div.style.borderRadius = '8px';
    div.style.lineHeight = '1.5';
    div.style.fontSize = '12px';
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.width = 'auto';

    // Set the title
    let html = '<strong>Global MOU Countries and Endorsers</strong><br>';

    // Initialize counters
    let numCountries = 0;
    let totalEndorsers = 0;
    const endorserCounts = {};

    // Define category colors
    const categoryColors = {
        Finance: '#0095D3',
        Fleet: '#5CC4BD',
        Knowledge: '#9C6EB0',
        Manufacturers: '#D1D439',
        Subnational: '#EF4E00',
        Utilities: '#ff9e18'
    };

    // Fetch both GeoJSONs and calculate stats
    Promise.all([
        fetch('country_gdp.geojson').then(response => response.json()),
        fetch('endorser.geojson').then(response => response.json())
    ])
    .then(([countriesData, endorsersData]) => {
        // Calculate the number of countries
        numCountries = countriesData.features.length;
        html += `${numCountries} Countries<br>`;

        // Calculate the number of endorsers and group by category
        totalEndorsers = endorsersData.features.length;
        endorsersData.features.forEach(feature => {
            const category = feature.properties.Category.split(' ')[0]; // Get the first word of the category
            if (category) {
                endorserCounts[category] = (endorserCounts[category] || 0) + 1;
            }
        });

        // Add total endorsers to HTML
        html += ` ${totalEndorsers} Endorsers<br><br>`;

        // Update the div with the stats
        div.innerHTML = html;

        // Add a bar graph
        const graphDiv = document.createElement('div'); // Container for the graph
        graphDiv.style.marginTop = '10px';
        graphDiv.style.width = '120%';

        // Dynamically adjust the height of the graph container and parent div
        const graphHeight = 180; // Adjust height for bars and labels
        graphDiv.style.height = `${graphHeight}px`;
        div.style.height = `auto`; // Let the div adjust dynamically to its content

        div.appendChild(graphDiv);

        // Create the bar graph
        createBarGraph(graphDiv, endorserCounts, categoryColors, graphHeight);
    })
    .catch(error => console.log("Error loading GeoJSON files:", error));

    return div;
};

function createBarGraph(container, data, colors, graphHeight) {
    // Prepare data for the graph
    const labels = Object.keys(data);
    const values = Object.values(data);

    // Create an SVG element for the graph
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', `${graphHeight}`); // Dynamically use the height
    container.appendChild(svg);

    // Define dimensions
    const barWidth = 80 / labels.length; // Percentage width for each bar
    const maxValue = Math.max(...values);
    const paddingTop = 20; // Add padding to ensure labels are not cut off

    // Draw bars
    labels.forEach((label, index) => {
        const barHeight = (values[index] / maxValue) * (graphHeight - 50 - paddingTop); // Adjust for padding

        // Calculate the x-position for the bar and label
        const barX = index * barWidth; // Starting position of the bar
        const labelX = barX + (barWidth - 4) / 2; // Center of the bar

        // Create a bar
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', `${barX}%`);
        rect.setAttribute('y', `${graphHeight - barHeight - 30}px`); // Adjust y-position to account for labels
        rect.setAttribute('width', `${barWidth - 5}%`); // Spacing between bars
        rect.setAttribute('height', `${barHeight}px`);
        rect.setAttribute('fill', colors[label] || '#808080'); // Default to grey if no color found
        svg.appendChild(rect);

        // Add a label above each bar with category name on one line and number on the next
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', `${labelX}%`);
        text.setAttribute('y', `${Math.max(graphHeight - barHeight - 50, paddingTop)}px`); // Ensure it stays within bounds
        text.setAttribute('text-anchor', 'middle'); // Center the text horizontally
        text.setAttribute('font-size', '8');
        text.setAttribute('fill', '#000'); // Black text color

        // Create the first line (category name)
        const tspan1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan1.setAttribute('x', `${labelX}%`);
        tspan1.setAttribute('dy', '0'); // First line at the current position
        tspan1.textContent = label;

        // Create the second line (number of endorsers)
        const tspan2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan2.setAttribute('x', `${labelX}%`);
        tspan2.setAttribute('dy', '1.2em'); // Move down for the second line
        tspan2.textContent = values[index];

        // Append tspan elements to the text element
        text.appendChild(tspan1);
        text.appendChild(tspan2);

        // Append the text element to the SVG
        svg.appendChild(text);
    });
}


// Add the control to the map
titleControl.addTo(map);

// Add the label layer to labelsPane to ensure it's on top
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    pane: 'labelsPane',
    attribution: '',
}).addTo(map);

// Add the Geocoder to the map
L.Control.geocoder({
    defaultMarkGeocode: true,
    position: 'topleft'
}).addTo(map);