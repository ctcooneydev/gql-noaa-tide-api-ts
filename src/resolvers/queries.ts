import { QueryResolvers } from "../__generated__/resolvers-types";
import "dotenv/config";
import axios from "axios";
import geolib from "geolib";
import moment from "moment";

// Use the generated `QueryResolvers` type to type check our queries!
const queries: QueryResolvers = {
  getNearbyStations: async (obj, args, context, info) => {
    const { latitude, longitude, maxDistanceFromOrigin, config } = args;

    // maxDistanceFromOrigin can be in kilometers or miles, if no config parameter is provided, default assumes kilometers
    // convert maxDistanceFromOrigin to meters depending on the config units
    // If not passed, default to 32.2 Km/~20 miles
    let radius = maxDistanceFromOrigin ? maxDistanceFromOrigin : 32.2; // 32.2 Km/~20 miles

    //convert maxDistanceFromOrigin to meters depending on the config units.
    if (config && config.units && config.units === "english") {
      //convert miles to meters
      radius = (radius * 5280) / 3.28;
    } else {
      //convert kilometers to meters
      radius *= 1000;
    }

    try {
      const response = await axios.get(process.env.NOAA_STATIONS_URL);
      if (response.status === 200) {
        const { data } = response;
        const { stations } = data;
        const nearbyStations = stations.filter((station) => {
          const stationLat = parseFloat(station.lat);
          const stationLng = parseFloat(station.lng);
          const distance = geolib.getDistance(
            { latitude, longitude },
            { lat: stationLat, lng: stationLng }
          );

          //set display distance in Km or miles depending on config. Default to Km
          if (config && config.units && config.units === "english") {
            station.distance = Math.ceil(distance / 1600);
          } else {
            station.distance = Math.ceil(distance / 1000);
          }
          return distance <= radius;
        });

        //sort by distance from passed latitude and longitude.
        nearbyStations.sort((a, b) => a.distance - b.distance);
        return nearbyStations;
      } else {
        throw new Error(
          `Failed to fetch NOAA tide stations: ${response.status}`
        );
      }
    } catch (error) {
      throw new Error(`Failed to fetch NOAA tide stations: ${error.message}`);
    }
  },
  getStationsByName: async (_, { name }, context, info) => {
    try {
      const response = await axios.get(process.env.NOAA_STATIONS_URL);
      if (response.status === 200) {
        const { data } = response;
        const { stations } = data;
        const nearbyStations = stations.filter((x) =>
          x.name.toLowerCase().includes(name.toLowerCase())
        );
        return nearbyStations;
      } else {
        throw new Error(
          `Failed to fetch NOAA tide stations: ${response.status}`
        );
      }
    } catch (error) {
      throw new Error(`Failed to fetch NOAA tide stations: ${error.message}`);
    }
  },
  getTidePredictionsByStationId: async (obj, args, context, info) => {
    try {
      const { stationId, beginDate, endDate, config } = args;

      //Build the request url
      let url = process.env.NOAA_TIDE_BASE_URL;

      // Add other fields to request url. If not passed, use defaults
      url += `&station=${stationId}`;

      //if begin and end date are not specified, will get 10 days of tides starting from today
      url += "&begin_date=";
      url += beginDate ? beginDate : moment().format("L");
      url += "&end_date=";
      url += endDate ? endDate : moment().add(10, "days").format("L");

      // defaults to metric values
      url += "&units=";
      url += config && config.units ? config.units : "metric";

      const response = await axios.get(url);
      if (response.status === 200) {
        const { data } = response;
        return data["predictions"] || null;
      } else {
        throw new Error(
          `Failed to fetch NOAA tide stations: ${response.status}`
        );
      }
    } catch (error) {
      throw new Error(`Failed to fetch NOAA tide stations: ${error.message}`);
    }
  },
};

export default queries;
