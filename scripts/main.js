// Google Maps Javascript API key: AIzaSyBNBO04zSveUymLn4nS5LYIVCRPTc2zMLk

const app = {};

app.cities = {
    "Toronto": "bixi-toronto",
    "Ottawa": "velogo",
    "Montréal": "bixi-montreal",
    "Vancouver": "Vancouver",
    "Victoria": "nextbike-victoria",
    "Hamilton": "sobi-hamilton"
}

app.availableBikes = [];

app.availableSlots = [];

app.events = () => {
    const locationPromise = new Promise((resolve, reject) => {
        navigator.geolocation.watchPosition(function(pos) {
        resolve(pos);
        });
    });

    locationPromise.then(pos => {
        const lat1 = pos.coords.latitude;

        const lng1 = pos.coords.longitude;

        app.getMap(lat1, lng1);

        app.getMarkers(lat1, lng1);
    });
};

const cityBikesURL = "http://api.citybik.es/v2/networks/bixi-toronto";

app.getLocations = (cityName) => {

    console.log(cityName);

    for (let city in app.cities) {
        if (cityName === city) {
            app.networkName = app.cities[city]
        }
    }    

    if (app.networkName === undefined) {
        app.home.infowindow.open(app.map, app.home)
    }

    const cityBikesURL = `https://api.citybik.es/v2/networks/${app.networkName}`;

    $.ajax({
        url: cityBikesURL,
        method: "GET",
        dataType: "json",
        data: {
        fields: "stations"
        }
    }).then(res => {
        const stations = res.network.stations;
        app.setLocations(stations);
    });
};

app.markers = [];

app.setLocations = stations => {
    stations.forEach(location => {
    const marker = new google.maps.Marker({
        position: new google.maps.LatLng(location.latitude, location.longitude),
        map: app.map,
        icon: "bicycle_marker.png",
        emptySlots: location.empty_slots,
        freeBikes: location.free_bikes
    });

    if (marker.emptySlots > 0) {
        app.availableSlots.push(marker);
    }
    if (marker.freeBikes > 0) {
        app.availableBikes.push(marker);
    }

    marker.distanceBetween = google.maps.geometry.spherical.computeDistanceBetween(
        marker.position,
        app.home.position
    );

    marker.infowindow = new google.maps.InfoWindow({
        content:    `<div class="info-window">
                        <p><strong>Location:</strong> ${location.name}</p>
                        <p><strong>Available Bikes:</strong> ${
                            location.free_bikes
                        }</p>
                        <p><strong>Empty Slots:</strong> ${
                            location.empty_slots
                        }</p>
                        <p><strong>Distance Between:</strong> ${Math.round(
                            marker.distanceBetween
                        )} metres</p></p>
                    </div>`
    });

    app.markers.push(marker);

        marker.addListener("click", function() {
            app.markers.forEach(marker => marker.infowindow.close());
            app.map.setZoom(17);
            app.map.setCenter(this.getPosition());
            this.infowindow.open(app.map, this);
        });
    });
};

app.getMarkers = (lat1, lng1) => {
    app.home = new google.maps.Marker({
    position: new google.maps.LatLng(lat1, lng1),
    map: app.map, // notice how we pass it the map we made earlier? This is how it knows which map to put the marker on
    icon: "your_location_marker.png",
    infowindow: new google.maps.InfoWindow({
        content: `<div>
                    <p>We cannot find a bikeshare network in your location</p>
                </div>`
        })
    });
};

app.getMap = function(lat1, lng1) {
    // Call current location, then input the position into a map object
    const mapOptions = {
        center: { lat: lat1, lng: lng1 },
        zoom: 17
    };

    const $mapDiv = $("#map")[0];

    app.directionsService = new google.maps.DirectionsService();
    app.directionsDisplay = new google.maps.DirectionsRenderer();

    app.geocoder = new google.maps.Geocoder;

    app.map = new google.maps.Map($mapDiv, mapOptions);

    app.geocodeLatLng(app.geocoder, app.map, mapOptions.center.lat, mapOptions.center.lng)

    app.directionsDisplay.setMap(app.map);
    app.getNearestBike(mapOptions.center.lat, mapOptions.center.lng);
};

app.findCityNameLoop = (components) => {
    for (let i = 0; i < components.length; i++) {

        const types = components[i].types

        for (let j = 0; j < types.length; j++) {
            if (types[j] === "locality") {
                app.cityName = components[i].long_name
                app.getLocations(app.cityName)
                break;
            }
        }
    }
}

app.geocodeLatLng = (geocoder, map, latGeo, lngGeo) => {
    var latlng = { lat: latGeo, lng: lngGeo };
    app.geocoder.geocode({ 'location': latlng }, function (results, status) {

        const components = results[0].address_components

        app.findCityNameLoop(components)

    })
}

app.getNearestBike = (homeLat, homeLng) => {
    const myLat = homeLat;
    const myLng = homeLng;

    $(`button`).on(`click`, function(e) {
    e.stopPropagation();

    const id = this.id;

    let travelMode = "";

    const distances = [];

    if (id === "getBike") {
        travelMode = "WALKING";
        app.availableBikes.map(function(item) {
            distances.push(item.distanceBetween);
        });
        console.log(distances);
    } else {
        travelMode = "BICYCLING";
        app.availableSlots.map(function(item) {
        distances.push(item.distanceBetween);
        });
    }

    app.markers.forEach(marker => marker.infowindow.close());

    const shortestDistance = Math.min(...distances);

    let closestLocation = {};

    for (let i = 0; i < app.markers.length; i++) {
        if (app.markers[i].distanceBetween === shortestDistance) {
        // console.log();

        app.map.setCenter(app.markers[i].getPosition());
        app.markers[i].infowindow.open(app.map, app.markers[i]);
        closestLocation = app.markers[i];
        }
    }
    closestLocation.lat = closestLocation.getPosition().lat();

    closestLocation.lng = closestLocation.getPosition().lng();

    // console.log(closestLocation.lat, closestLocation.lng);

    app.calcRoute(
        myLat,
        myLng,
        closestLocation.lat,
        closestLocation.lng,
        travelMode
    );
    });
};

app.calcRoute = (homeLat, homeLng, destLat, destLng, mode) => {
    console.log(
    `You're at ${homeLat} ${homeLng}. You're going to ${destLat} ${destLng} by ${mode}.`
    );
    const yourStart = new google.maps.LatLng(homeLat, homeLng);
    const yourEnd = new google.maps.LatLng(destLat, destLng);
    const yourMode = mode;
    const request = {
    origin: yourStart,
    destination: yourEnd,
    travelMode: yourMode
    };
    app.directionsService.route(request, function(response, status) {
    if (status === "OK") {
        app.directionsDisplay.setDirections(response);
    }
    });
};

app.init = () => {
    app.events();
};

$(app.init);
